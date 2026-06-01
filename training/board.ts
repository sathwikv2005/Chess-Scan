import fs from 'fs'
import path from 'path'
import sharp from 'sharp'

const BOARD_DIR = path.join(process.cwd(), 'training', 'datasets', 'board')

interface CachedBoard {
	white: Buffer
	black: Buffer
	name: string
}

const boardCache: CachedBoard[] = []

export async function loadBoardCache(): Promise<void> {
	const files = fs.readdirSync(BOARD_DIR).filter((file) => /\.(png|jpg|jpeg|webp)$/i.test(file))
	console.log(files)
	for (const file of files) {
		const imagePath = path.join(BOARD_DIR, file)

		const image = sharp(imagePath)
		const metadata = await image.metadata()

		if (!metadata.width || !metadata.height) {
			throw new Error(`Failed to read dimensions of ${file}`)
		}

		const squareSize = metadata.height

		const white = await image
			.clone()
			.extract({
				left: 0,
				top: 0,
				width: squareSize,
				height: squareSize,
			})
			.png()
			.toBuffer()

		const black = await image
			.clone()
			.extract({
				left: squareSize,
				top: 0,
				width: squareSize,
				height: squareSize,
			})
			.png()
			.toBuffer()

		boardCache.push({
			name: file,
			white,
			black,
		})
	}

	console.log(`Loaded ${boardCache.length} board themes`)
}

export function getSquare(): {
	buffer: Buffer
	color: 'white' | 'black'
	theme: string
} {
	if (boardCache.length === 0) {
		throw new Error('Board cache not loaded')
	}

	const board = boardCache[Math.floor(Math.random() * boardCache.length)]

	const isWhite = Math.random() < 0.5

	return {
		buffer: isWhite ? board.white : board.black,
		color: isWhite ? 'white' : 'black',
		theme: board.name,
	}
}
