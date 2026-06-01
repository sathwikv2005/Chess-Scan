import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { getSquare, loadBoardCache } from './board'

const PIECE_DIR = path.join(process.cwd(), 'training', 'datasets', 'piece')
const OUTPUT_DIR = path.join(process.cwd(), 'training', 'datasets', 'generated')

const BATCH_SIZE = 64

interface CachedPiece {
	path: string
	buffer: Buffer
}

interface PieceCache {
	[label: string]: CachedPiece[]
}

const pieceCache: PieceCache = {}

function getThemes(): string[] {
	return fs
		.readdirSync(PIECE_DIR, { withFileTypes: true })
		.filter((dirent) => dirent.isDirectory())
		.map((dirent) => dirent.name)
}

function random(min: number, max: number): number {
	return Math.random() * (max - min) + min
}

function randomInt(min: number, max: number): number {
	return Math.floor(random(min, max + 1))
}

async function loadPieceCache(): Promise<void> {
	const themes = getThemes()

	for (const theme of themes) {
		const themeDir = path.join(PIECE_DIR, theme)

		for (const file of fs.readdirSync(themeDir)) {
			const fullPath = path.join(themeDir, file)

			try {
				const buffer = fs.readFileSync(fullPath)

				// Validate image
				await sharp(buffer).png().toBuffer()

				const label = path.parse(file).name

				// Valid chess piece labels only
				if (!/^([bw][BKNPQR])$/.test(label)) {
					continue
				}

				pieceCache[label] ??= []

				pieceCache[label].push({
					path: fullPath,
					buffer,
				})
			} catch {
				console.warn(`Skipping invalid image: ${fullPath}`)
			}
		}
	}

	console.log(`Loaded ${Object.values(pieceCache).reduce((a, b) => a + b.length, 0)} piece images`)
}

function getLabels(): string[] {
	return ['Empty', ...Object.keys(pieceCache).sort()]
}

function getRandomPiece(label: string): CachedPiece {
	const pieces = pieceCache[label]

	if (!pieces?.length) {
		throw new Error(`No valid pieces found for label: ${label}`)
	}

	return pieces[Math.floor(Math.random() * pieces.length)]
}

async function augmentImage(image: Buffer): Promise<Buffer> {
	let pipeline = sharp(image)

	pipeline = pipeline.modulate({
		brightness: random(0.9, 1.1),
		saturation: random(0.9, 1.1),
	})

	// Small blur occasionally
	if (Math.random() < 0.1) {
		pipeline = pipeline.blur(random(0.3, 0.8))
	}

	// Simulate screenshot compression
	const jpegBuffer = await pipeline
		.jpeg({
			quality: randomInt(75, 100),
		})
		.toBuffer()

	return sharp(jpegBuffer).png().toBuffer()
}

async function generateSquareImage(label: string): Promise<Buffer> {
	const square = getSquare()

	const squareMeta = await sharp(square.buffer).metadata()

	const squareSize = Math.min(squareMeta.width ?? 64, squareMeta.height ?? 64)

	// Empty square
	if (label === 'Empty') {
		return augmentImage(square.buffer)
	}

	const piece = getRandomPiece(label)

	// Piece occupies roughly 78% - 92% of square
	const scale = random(0.78, 0.92)

	const pieceSize = Math.floor(squareSize * scale)

	const pieceBuffer = await sharp(piece.buffer)
		.resize({
			width: pieceSize,
			height: pieceSize,
			fit: 'inside',
		})
		.png()
		.toBuffer()

	const pieceMeta = await sharp(pieceBuffer).metadata()

	const pieceWidth = pieceMeta.width ?? pieceSize
	const pieceHeight = pieceMeta.height ?? pieceSize

	const offsetX = randomInt(-3, 3)
	const offsetY = randomInt(-3, 3)

	const left = Math.max(0, Math.floor((squareSize - pieceWidth) / 2) + offsetX)

	const top = Math.max(0, Math.floor((squareSize - pieceHeight) / 2) + offsetY)

	const image = await sharp(square.buffer)
		.composite([
			{
				input: pieceBuffer,
				left,
				top,
			},
		])
		.png()
		.toBuffer()

	return augmentImage(image)
}

export async function generateDataset(sizePerClass: number = 100): Promise<void> {
	console.log('Loading board themes...')
	await loadBoardCache()

	console.log('Loading piece themes...')
	await loadPieceCache()

	const labels = getLabels()

	console.log(`Classes (${labels.length}):`)
	console.log(labels.join(', '))
	console.log(`Images per class: ${sizePerClass}`)

	fs.mkdirSync(OUTPUT_DIR, { recursive: true })

	const totalImages = labels.length * sizePerClass

	let generated = 0
	const startTime = Date.now()

	function printProgress() {
		const elapsed = (Date.now() - startTime) / 1000

		const rate = generated / Math.max(elapsed, 1)

		const remaining = totalImages - generated

		const eta = remaining / Math.max(rate, 1)

		process.stdout.write(
			`\r${generated.toLocaleString()}/${totalImages.toLocaleString()} | ${(
				(generated / totalImages) *
				100
			).toFixed(2)}% | ${rate.toFixed(0)} img/s | ETA ${(eta / 60).toFixed(1)} min`,
		)
	}

	for (const label of labels) {
		console.log(`\nGenerating ${label}...`)

		const classDir = path.join(OUTPUT_DIR, label)

		fs.mkdirSync(classDir, { recursive: true })

		for (let batchStart = 0; batchStart < sizePerClass; batchStart += BATCH_SIZE) {
			const batchEnd = Math.min(batchStart + BATCH_SIZE, sizePerClass)

			const batch: Promise<void>[] = []

			for (let i = batchStart; i < batchEnd; i++) {
				batch.push(
					(async () => {
						const image = await generateSquareImage(label)

						await fs.promises.writeFile(path.join(classDir, `${i}.png`), image)

						generated++

						if (generated % 1000 === 0) {
							printProgress()
						}
					})(),
				)
			}

			await Promise.all(batch)
		}

		console.log(` ✓ ${label} complete`)
	}

	printProgress()

	const elapsedSeconds = (Date.now() - startTime) / 1000

	console.log('\n\nDataset generation complete')
	console.log(`Generated ${generated.toLocaleString()} images`)
	console.log(`Time: ${(elapsedSeconds / 60).toFixed(1)} minutes`)
	console.log(`Average speed: ${(generated / elapsedSeconds).toFixed(0)} img/s`)
}

generateDataset(25_000).catch(console.error)
