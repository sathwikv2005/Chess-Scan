import fs from 'fs/promises'
import sharp from 'sharp'
import * as ort from 'onnxruntime-node'
import path from 'path'

const BOARD_SIZE = 256
import { ImageInput, RawImage } from '../types'
import { getBoardDetector } from './getBoardDetector'

async function saveRawImage(image: RawImage, outputPath: string) {
	await fs.mkdir(path.dirname(outputPath), { recursive: true })

	await sharp(Buffer.from(image.data), {
		raw: {
			width: image.width,
			height: image.height,
			channels: 4,
		},
	})
		.png()
		.toFile(outputPath)
}

export async function saveDebugImages(board: RawImage, squares: RawImage[]) {
	const debugDir = path.join(process.cwd(), 'debug')
	const squaresDir = path.join(debugDir, 'squares')

	await fs.mkdir(squaresDir, { recursive: true })

	await saveRawImage(board, path.join(debugDir, 'board.png'))

	await Promise.all(
		squares.map((square, i) =>
			saveRawImage(square, path.join(squaresDir, `${Math.floor(i / 8)}-${i % 8}.png`)),
		),
	)
}

export async function saveTensor(tensor: ort.Tensor, outputPath = 'debug/tensor.png') {
	const pixels = 512 * 512
	const rgba = Buffer.alloc(pixels * 4)

	const data = tensor.data as Float32Array

	for (let i = 0; i < pixels; i++) {
		rgba[i * 4] = Math.max(0, Math.min(255, Math.round(data[i] * 255)))

		rgba[i * 4 + 1] = Math.max(0, Math.min(255, Math.round(data[pixels + i] * 255)))

		rgba[i * 4 + 2] = Math.max(0, Math.min(255, Math.round(data[pixels * 2 + i] * 255)))

		rgba[i * 4 + 3] = 255
	}

	await fs.mkdir('debug', { recursive: true })

	await sharp(rgba, {
		raw: {
			width: 512,
			height: 512,
			channels: 4,
		},
	})
		.png()
		.toFile(outputPath)
}

export async function loadImage(input: ImageInput): Promise<RawImage> {
	let source: Buffer

	if (typeof input === 'string') {
		if (input.startsWith('http://') || input.startsWith('https://')) {
			const response = await fetch(input)

			if (!response.ok) {
				throw new Error(`Failed to fetch image`)
			}

			source = Buffer.from(await response.arrayBuffer())
		} else {
			source = await fs.readFile(input)
		}
	} else {
		source = input
	}

	const { data, info } = await sharp(source)
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true })

	return {
		width: info.width,
		height: info.height,
		data: new Uint8ClampedArray(data),
	}
}

async function createTensor(image: RawImage) {
	const { data, info } = await sharp(Buffer.from(image.data), {
		raw: {
			width: image.width,
			height: image.height,
			channels: 4,
		},
	})
		.resize(512, 512)
		.removeAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true })

	const float = new Float32Array(3 * 512 * 512)

	for (let i = 0; i < 512 * 512; i++) {
		const src = i * info.channels

		float[i] = data[src] / 255
		float[512 * 512 + i] = data[src + 1] / 255
		float[2 * 512 * 512 + i] = data[src + 2] / 255
	}

	return new ort.Tensor('float32', float, [1, 3, 512, 512])
}

export async function getBoardFromRaw(image: RawImage): Promise<RawImage> {
	await fs.mkdir('debug', { recursive: true })

	await saveRawImage(image, 'debug/01-input.png')

	const session = await getBoardDetector()

	const tensor = await createTensor(image)

	await saveTensor(tensor, 'debug/02-model-input.png')

	const outputs = await session.run({
		images: tensor,
	})

	const outputTensor = outputs[session.outputNames[0]]

	const output = outputTensor.data as Float32Array

	const numPredictions = outputTensor.dims[2]

	let bestConf = -Infinity

	let bestBox:
		| {
				x: number
				y: number
				w: number
				h: number
		  }
		| undefined

	const detections: {
		conf: number
		x: number
		y: number
		w: number
		h: number
		index: number
	}[] = []

	for (let i = 0; i < numPredictions; i++) {
		const x = output[i]
		const y = output[numPredictions + i]
		const w = output[numPredictions * 2 + i]
		const h = output[numPredictions * 3 + i]
		const conf = output[numPredictions * 4 + i]

		detections.push({
			index: i,
			conf,
			x,
			y,
			w,
			h,
		})

		if (conf > bestConf) {
			bestConf = conf
			bestBox = { x, y, w, h }
		}
	}

	detections.sort((a, b) => b.conf - a.conf)

	if (!bestBox) {
		throw new Error('Board not found')
	}

	const scaleX = image.width / 512
	const scaleY = image.height / 512

	const left = Math.max(0, Math.round((bestBox.x - bestBox.w / 2) * scaleX))

	const top = Math.max(0, Math.round((bestBox.y - bestBox.h / 2) * scaleY))

	const right = Math.min(image.width, Math.round((bestBox.x + bestBox.w / 2) * scaleX))

	const bottom = Math.min(image.height, Math.round((bestBox.y + bestBox.h / 2) * scaleY))

	const width = right - left
	const height = bottom - top

	if (width <= 0 || height <= 0) {
		throw new Error('Invalid board bounding box')
	}

	// 4. Save crop before resize
	await sharp(Buffer.from(image.data), {
		raw: {
			width: image.width,
			height: image.height,
			channels: 4,
		},
	})
		.extract({
			left,
			top,
			width,
			height,
		})
		.png()
		.toFile('debug/04-crop-before-resize.png')

	const { data, info } = await sharp(Buffer.from(image.data), {
		raw: {
			width: image.width,
			height: image.height,
			channels: 4,
		},
	})
		.extract({
			left,
			top,
			width,
			height,
		})
		.resize(BOARD_SIZE, BOARD_SIZE)
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true })

	await sharp(Buffer.from(data), {
		raw: {
			width: info.width,
			height: info.height,
			channels: 4,
		},
	})
		.png()
		.toFile('debug/05-board.png')

	return {
		width: info.width,
		height: info.height,
		data: new Uint8ClampedArray(data),
	}
}

export async function getBoard(input: ImageInput): Promise<RawImage> {
	const image = await loadImage(input)

	return getBoardFromRaw(image)
}

export async function getSquares(input: ImageInput): Promise<RawImage[]> {
	const board = await getBoard(input)

	const squares: RawImage[] = []

	for (let row = 0; row < 8; row++) {
		for (let col = 0; col < 8; col++) {
			const data = new Uint8ClampedArray(32 * 32 * 4)

			for (let y = 0; y < 32; y++) {
				for (let x = 0; x < 32; x++) {
					const src = ((row * 32 + y) * board.width + (col * 32 + x)) * 4

					const dst = (y * 32 + x) * 4

					data[dst] = board.data[src]

					data[dst + 1] = board.data[src + 1]

					data[dst + 2] = board.data[src + 2]

					data[dst + 3] = board.data[src + 3]
				}
			}

			squares.push({
				width: 32,
				height: 32,
				data,
			})
		}
	}

	return squares
}
