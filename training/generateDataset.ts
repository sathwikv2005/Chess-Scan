// dataset-generator.ts
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { getSquare, loadBoardCache } from './board'
import { applyRandomArtifacts } from './model/artifact'

const PIECE_DIR = path.join(process.cwd(), 'training', 'datasets', 'piece')
const GRID_DIR = path.join(process.cwd(), 'training', 'datasets', 'grid')
const OUTPUT_DIR = path.join(process.cwd(), 'training', 'datasets', 'generated')

const BATCH_SIZE = 64
const OUTPUT_SIZE = 32
export const WORKING_SIZE = 96

interface CachedPiece {
	path: string
	buffer: Buffer
}

interface PieceCache {
	[label: string]: CachedPiece[]
}

interface GridOverlay {
	buffer: Buffer
	name: string
}

const pieceCache: PieceCache = {}
const gridOverlays: GridOverlay[] = []

export function random(min: number, max: number) {
	return Math.random() * (max - min) + min
}
export function randomInt(min: number, max: number) {
	return Math.floor(random(min, max + 1))
}

export async function loadGridCache() {
	if (!fs.existsSync(GRID_DIR)) return
	for (const file of fs.readdirSync(GRID_DIR)) {
		gridOverlays.push({
			name: file,
			buffer: await fs.promises.readFile(path.join(GRID_DIR, file)),
		})
	}
}

export async function loadPieceCache() {
	const themes = fs
		.readdirSync(PIECE_DIR, { withFileTypes: true })
		.filter((d) => d.isDirectory())
		.map((d) => d.name)

	for (const theme of themes) {
		for (const file of fs.readdirSync(path.join(PIECE_DIR, theme))) {
			const full = path.join(PIECE_DIR, theme, file)
			try {
				const buffer = fs.readFileSync(full)
				await sharp(buffer).png().toBuffer()

				const label = path.parse(file).name
				if (!/^([bw][BKNPQR])$/.test(label)) continue

				pieceCache[label] ??= []
				pieceCache[label].push({ path: full, buffer })
			} catch {}
		}
	}
}

function getRandomPiece(label: string) {
	const pieces = pieceCache[label]
	return pieces[Math.floor(Math.random() * pieces.length)]
}

async function applyRandomGrid(image: Buffer) {
	if (gridOverlays.length === 0) return image
	if (Math.random() > 0.35) return image

	const overlay = gridOverlays[randomInt(0, gridOverlays.length - 1)]

	return sharp(image)
		.composite([{ input: overlay.buffer }])
		.png()
		.toBuffer()
}

async function augmentImage(image: Buffer) {
	let pipeline = sharp(image)

	pipeline = pipeline.modulate({
		brightness: random(0.8, 1.2),
		saturation: random(0.75, 1.25),
	})

	if (Math.random() < 0.25) {
		pipeline = pipeline.blur(random(0.3, 1.5))
	}

	let buffer = await pipeline.jpeg({ quality: randomInt(45, 100) }).toBuffer()

	if (Math.random() < 0.6) {
		const scale = random(0.75, 1.35)

		buffer = await sharp(buffer)
			.resize(Math.round(WORKING_SIZE * scale))
			.resize(WORKING_SIZE, WORKING_SIZE)
			.png()
			.toBuffer()
	}

	if (Math.random() < 0.4) {
		const crop = randomInt(1, 4)

		buffer = await sharp(buffer)
			.extract({
				left: crop,
				top: crop,
				width: WORKING_SIZE - crop * 2,
				height: WORKING_SIZE - crop * 2,
			})
			.resize(WORKING_SIZE, WORKING_SIZE)
			.png()
			.toBuffer()
	}

	return sharp(buffer).resize(OUTPUT_SIZE, OUTPUT_SIZE).png().toBuffer()
}

async function generateSquareImage(label: string) {
	const square = getSquare()

	let board = await sharp(square.buffer).resize(WORKING_SIZE, WORKING_SIZE).png().toBuffer()

	if (label !== 'Empty') {
		const piece = getRandomPiece(label)

		const scale = random(0.75, 0.95)
		const pieceSize = Math.floor(WORKING_SIZE * scale)

		const pieceBuffer = await sharp(piece.buffer)
			.resize({
				width: pieceSize,
				height: pieceSize,
				fit: 'inside',
			})
			.png()
			.toBuffer()

		const meta = await sharp(pieceBuffer).metadata()
		const pw = meta.width ?? pieceSize
		const ph = meta.height ?? pieceSize

		board = await sharp(board)
			.composite([
				{
					input: pieceBuffer,
					left: Math.max(0, Math.floor((WORKING_SIZE - pw) / 2) + randomInt(-4, 4)),
					top: Math.max(0, Math.floor((WORKING_SIZE - ph) / 2) + randomInt(-4, 4)),
				},
			])
			.png()
			.toBuffer()
	}

	board = await applyRandomGrid(board)

	board = await applyRandomArtifacts(board)

	return augmentImage(board)
}

async function main(sizePerClass = 25000) {
	await loadBoardCache()
	await loadPieceCache()
	await loadGridCache()

	const labels = ['Empty', ...Object.keys(pieceCache).sort()]

	const totalImages = labels.length * sizePerClass

	let generated = 0
	const startTime = Date.now()

	function printProgress() {
		const elapsed = (Date.now() - startTime) / 1000

		const rate = generated / Math.max(elapsed, 1)

		const remaining = totalImages - generated

		const etaSeconds = remaining / Math.max(rate, 1)

		process.stdout.write(
			`\r${generated.toLocaleString()}/${totalImages.toLocaleString()} | ${(
				(generated / totalImages) *
				100
			).toFixed(2)}% | ${rate.toFixed(0)} img/s | ETA ${(etaSeconds / 60).toFixed(1)} min`,
		)
	}

	fs.mkdirSync(OUTPUT_DIR, { recursive: true })

	for (const label of labels) {
		const dir = path.join(OUTPUT_DIR, label)
		fs.mkdirSync(dir, { recursive: true })

		for (let i = 0; i < sizePerClass; i += BATCH_SIZE) {
			await Promise.all(
				Array.from({ length: Math.min(BATCH_SIZE, sizePerClass - i) }).map(async (_, j) => {
					const img = await generateSquareImage(label)
					await fs.promises.writeFile(path.join(dir, `${i + j}.png`), img)
					generated++

					if (generated % 250 === 0 || generated === totalImages) {
						printProgress()
					}
				}),
			)
		}
	}
}

main(30000).catch(console.error)
