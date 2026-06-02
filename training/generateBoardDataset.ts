import fs from 'fs/promises'
import path from 'path'
import sharp from 'sharp'
import { getRandomPiece, loadPieceCache } from './generateDataset'

sharp.cache(false)
sharp.concurrency(0)

const PIECE_LABELS = ['wP', 'wN', 'wB', 'wR', 'wQ', 'wK', 'bP', 'bN', 'bB', 'bR', 'bQ', 'bK']

const THEMES_DIR = path.join(process.cwd(), 'training', 'datasets', 'board_themes')

const OUTPUT_IMAGES = path.join(process.cwd(), 'training', 'datasets', 'detector', 'images')

const OUTPUT_LABELS = path.join(process.cwd(), 'training', 'datasets', 'detector', 'labels')

const CANVAS_SIZE = 1024
const BOARD_RENDER_SIZE = 256
const SAMPLES_PER_THEME = 1000
const CONCURRENCY = 16

const boardThemeCache = new Map<string, Buffer>()
const pieceRenderCache = new Map<string, Buffer[]>()

function random(min: number, max: number) {
	return Math.random() * (max - min) + min
}

function randomInt(min: number, max: number) {
	return Math.floor(random(min, max + 1))
}

async function ensureDirectories() {
	await fs.mkdir(OUTPUT_IMAGES, { recursive: true })
	await fs.mkdir(OUTPUT_LABELS, { recursive: true })
}

async function getThemes() {
	const files = await fs.readdir(THEMES_DIR)

	return files.filter((f) =>
		['.png', '.jpg', '.jpeg', '.webp'].includes(path.extname(f).toLowerCase()),
	)
}

async function buildThemeCache(themes: string[]) {
	for (const theme of themes) {
		const buffer = await sharp(path.join(THEMES_DIR, theme))
			.resize(BOARD_RENDER_SIZE, BOARD_RENDER_SIZE)
			.jpeg({ quality: 95 })
			.toBuffer()

		boardThemeCache.set(theme, buffer)
	}
}

async function buildPieceRenderCache() {
	const pieceSize = Math.round((BOARD_RENDER_SIZE / 8) * 0.85)

	for (const label of PIECE_LABELS) {
		const renders: Buffer[] = []

		for (let i = 0; i < 32; i++) {
			const piece = getRandomPiece(label)

			renders.push(await sharp(piece.buffer).resize(pieceSize, pieceSize).png().toBuffer())
		}

		pieceRenderCache.set(label, renders)
	}
}

function getCachedPiece(label: string) {
	const sprites = pieceRenderCache.get(label)!

	return sprites[randomInt(0, sprites.length - 1)]
}

async function createBackground() {
	return sharp({
		create: {
			width: CANVAS_SIZE,
			height: CANVAS_SIZE,
			channels: 3,
			background: {
				r: randomInt(20, 235),
				g: randomInt(20, 235),
				b: randomInt(20, 235),
			},
		},
	})
}

function yoloLabel(x: number, y: number, width: number, height: number) {
	const centerX = (x + width / 2) / CANVAS_SIZE
	const centerY = (y + height / 2) / CANVAS_SIZE

	return `0 ${centerX} ${centerY} ${width / CANVAS_SIZE} ${height / CANVAS_SIZE}`
}

async function renderBoardWithPieces(theme: string): Promise<Buffer> {
	let board = sharp(boardThemeCache.get(theme)!)

	if (Math.random() < 0.3) {
		return board.jpeg({ quality: 95 }).toBuffer()
	}

	const squareSize = BOARD_RENDER_SIZE / 8

	const occupied = new Set<string>()

	const overlays: sharp.OverlayOptions[] = []

	const pieceCount = randomInt(4, 32)

	for (let i = 0; i < pieceCount; i++) {
		let row: number
		let col: number
		let key: string

		do {
			row = randomInt(0, 7)
			col = randomInt(0, 7)

			key = `${row},${col}`
		} while (occupied.has(key))

		occupied.add(key)

		const label = PIECE_LABELS[randomInt(0, PIECE_LABELS.length - 1)]

		overlays.push({
			input: getCachedPiece(label),
			left: Math.round(col * squareSize + squareSize * 0.075),
			top: Math.round(row * squareSize + squareSize * 0.075),
		})
	}

	return board.composite(overlays).jpeg({ quality: 95 }).toBuffer()
}

async function generateSample(theme: string, index: number) {
	const boardSize = randomInt(250, 900)

	const x = randomInt(0, CANVAS_SIZE - boardSize)
	const y = randomInt(0, CANVAS_SIZE - boardSize)

	let board = sharp(await renderBoardWithPieces(theme)).resize(boardSize, boardSize)

	if (Math.random() < 0.2) {
		board = board.blur(random(0.3, 1.5))
	}

	const boardBuffer = await board.jpeg({ quality: 95 }).toBuffer()

	const imageBuffer = await (
		await createBackground()
	)
		.composite([
			{
				input: boardBuffer,
				left: x,
				top: y,
			},
		])
		.jpeg({
			quality: randomInt(40, 100),
		})
		.toBuffer()

	const filename = `sample_${index}`

	await Promise.all([
		fs.writeFile(path.join(OUTPUT_IMAGES, `${filename}.jpg`), imageBuffer),
		fs.writeFile(
			path.join(OUTPUT_LABELS, `${filename}.txt`),
			yoloLabel(x, y, boardSize, boardSize),
		),
	])
}

async function main() {
	await loadPieceCache()

	const themes = await getThemes()

	await Promise.all([ensureDirectories(), buildThemeCache(themes), buildPieceRenderCache()])

	const totalImages = themes.length * SAMPLES_PER_THEME

	const startTime = Date.now()

	let counter = 0

	for (let themeIndex = 0; themeIndex < themes.length; themeIndex++) {
		const theme = themes[themeIndex]

		const batch: Promise<void>[] = []

		for (let i = 0; i < SAMPLES_PER_THEME; i++) {
			batch.push(generateSample(theme, counter++))

			if (batch.length >= CONCURRENCY) {
				await Promise.all(batch)

				batch.length = 0

				const elapsed = (Date.now() - startTime) / 1000

				const ips = counter / elapsed

				const remaining = totalImages - counter

				const eta = remaining / ips / 60

				process.stdout.write(
					`\rTheme ${themeIndex + 1}/${themes.length} (${theme}) | ` +
						`[${((counter / totalImages) * 100).toFixed(1)}%] ` +
						`${counter}/${totalImages} | ` +
						`${ips.toFixed(1)} img/s | ETA ${eta.toFixed(1)} min`,
				)
			}
		}

		if (batch.length) {
			await Promise.all(batch)
		}
	}

	const totalMinutes = (Date.now() - startTime) / 60000

	console.log('\n')
	console.log(`Done. Generated ${counter} images in ${totalMinutes.toFixed(2)} minutes`)
}

main().catch(console.error)
