import fs from 'fs/promises'
import path from 'path'

const DATASET_DIR = path.join(process.cwd(), 'training', 'datasets', 'detector')

const IMAGES_DIR = path.join(DATASET_DIR, 'images')
const LABELS_DIR = path.join(DATASET_DIR, 'labels')

function shuffle<T>(array: T[]): T[] {
	const arr = [...array]

	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))

		;[arr[i], arr[j]] = [arr[j], arr[i]]
	}

	return arr
}

async function ensureDirectories() {
	await fs.mkdir(path.join(IMAGES_DIR, 'train'), {
		recursive: true,
	})

	await fs.mkdir(path.join(IMAGES_DIR, 'val'), {
		recursive: true,
	})

	await fs.mkdir(path.join(LABELS_DIR, 'train'), {
		recursive: true,
	})

	await fs.mkdir(path.join(LABELS_DIR, 'val'), {
		recursive: true,
	})
}

async function moveSample(baseName: string, split: 'train' | 'val') {
	const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp']

	let imageExtension: string | null = null

	for (const ext of imageExtensions) {
		try {
			await fs.access(path.join(IMAGES_DIR, `${baseName}${ext}`))

			imageExtension = ext

			break
		} catch {}
	}

	if (!imageExtension) {
		throw new Error(`Image not found: ${baseName}`)
	}

	await fs.rename(
		path.join(IMAGES_DIR, `${baseName}${imageExtension}`),
		path.join(IMAGES_DIR, split, `${baseName}${imageExtension}`),
	)

	await fs.rename(
		path.join(LABELS_DIR, `${baseName}.txt`),
		path.join(LABELS_DIR, split, `${baseName}.txt`),
	)
}

async function main() {
	await ensureDirectories()

	const files = await fs.readdir(IMAGES_DIR)

	const imageFiles = files.filter((file) =>
		['.jpg', '.jpeg', '.png', '.webp'].includes(path.extname(file).toLowerCase()),
	)

	const baseNames = imageFiles.map((file) => path.parse(file).name)

	const shuffled = shuffle(baseNames)

	const trainCount = Math.floor(shuffled.length * 0.8)

	const train = shuffled.slice(0, trainCount)
	const val = shuffled.slice(trainCount)

	for (const name of train) {
		await moveSample(name, 'train')
	}

	for (const name of val) {
		await moveSample(name, 'val')
	}

	console.log(`Train: ${train.length}`)
	console.log(`Val: ${val.length}`)
}

main().catch(console.error)
