import { ImageInput } from '../types'

const MIN_SQUARE_SIZE = 32
const MIN_BOARD_SIZE = 8 * MIN_SQUARE_SIZE

export async function loadImage(input: ImageInput): Promise<ImageBitmap> {
	try {
		let blob: Blob

		if (typeof input === 'string') {
			const res = await fetch(input)

			if (!res.ok) {
				throw new Error(`Failed to fetch image (${res.status} ${res.statusText})`)
			}

			blob = await res.blob()
		} else if (input instanceof Blob) {
			blob = input
		} else if (input instanceof Uint8Array) {
			blob = new Blob([input.slice().buffer])
		} else {
			blob = new Blob([input])
		}

		return await createImageBitmap(blob)
	} catch (error) {
		throw new Error(
			`Failed to load image: ${error instanceof Error ? error.message : String(error)}`,
		)
	}
}

export async function getBoard(input: ImageInput): Promise<ImageData> {
	const bitmap = await loadImage(input)

	if (bitmap.width < MIN_BOARD_SIZE || bitmap.height < MIN_BOARD_SIZE) {
		throw new Error('Image is too small.')
	}

	const canvas = document.createElement('canvas')

	canvas.width = bitmap.width
	canvas.height = bitmap.height

	const ctx = canvas.getContext('2d')

	if (!ctx) {
		throw new Error('Failed to create canvas context')
	}

	ctx.drawImage(bitmap, 0, 0)

	return ctx.getImageData(0, 0, canvas.width, canvas.height)
}

export function getSquares(board: ImageData): ImageData[] {
	if (board.width !== board.height) {
		throw new Error('Board image must be square')
	}

	if (board.width < MIN_BOARD_SIZE || board.height < MIN_BOARD_SIZE) {
		throw new Error('Board image is too small')
	}

	const squares: ImageData[] = []

	const squareWidth = Math.floor(board.width / 8)
	const squareHeight = Math.floor(board.height / 8)

	for (let row = 0; row < 8; row++) {
		for (let col = 0; col < 8; col++) {
			const data = new Uint8ClampedArray(squareWidth * squareHeight * 4)

			for (let y = 0; y < squareHeight; y++) {
				for (let x = 0; x < squareWidth; x++) {
					const src = ((row * squareHeight + y) * board.width + (col * squareWidth + x)) * 4

					const dst = (y * squareWidth + x) * 4

					data[dst] = board.data[src]
					data[dst + 1] = board.data[src + 1]
					data[dst + 2] = board.data[src + 2]
					data[dst + 3] = board.data[src + 3]
				}
			}

			squares.push(new ImageData(data, squareWidth, squareHeight))
		}
	}

	return squares
}

export async function toSquares(input: ImageInput): Promise<ImageData[]> {
	const board = await getBoard(input)

	return getSquares(board)
}
