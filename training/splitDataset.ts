import fs from 'fs/promises'
import path from 'path'

const GENERATED_DIR = path.join(process.cwd(), 'training', 'datasets', 'generated')

const TRAIN_DIR = path.join(process.cwd(), 'training', 'datasets', 'train')

const TEST_DIR = path.join(process.cwd(), 'training', 'datasets', 'test')

function shuffle<T>(array: T[]): T[] {
	const arr = [...array]

	for (let i = arr.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1))
		;[arr[i], arr[j]] = [arr[j], arr[i]]
	}

	return arr
}

async function splitDataset() {
	const classes = await fs.readdir(GENERATED_DIR)

	for (const className of classes) {
		const classDir = path.join(GENERATED_DIR, className)

		const stat = await fs.stat(classDir)
		if (!stat.isDirectory()) continue

		const files = await fs.readdir(classDir)

		const shuffled = shuffle(files)

		const testCount = Math.floor(files.length * 0.2)

		const testFiles = new Set(shuffled.slice(0, testCount))

		const trainClassDir = path.join(TRAIN_DIR, className)
		const testClassDir = path.join(TEST_DIR, className)

		await fs.mkdir(trainClassDir, { recursive: true })
		await fs.mkdir(testClassDir, { recursive: true })

		console.log(`${className}: train=${files.length - testCount}, test=${testCount}`)

		for (const file of files) {
			const src = path.join(classDir, file)

			if (testFiles.has(file)) {
				await fs.copyFile(src, path.join(testClassDir, file))
			} else {
				await fs.copyFile(src, path.join(trainClassDir, file))
			}
		}
	}

	console.log('Dataset split complete')
}

splitDataset().catch(console.error)
