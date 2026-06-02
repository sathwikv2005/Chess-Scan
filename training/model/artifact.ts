import { randomInt } from 'crypto'
import sharp from 'sharp'
import { WORKING_SIZE, random } from '../generateDataset'

export async function applyRandomArtifacts(image: Buffer): Promise<Buffer> {
	const svgParts: string[] = []

	// random annotation lines
	if (Math.random() < 0.15) {
		const count = randomInt(1, 3)

		for (let i = 0; i < count; i++) {
			const x1 = randomInt(0, WORKING_SIZE)
			const y1 = randomInt(0, WORKING_SIZE)

			const x2 = randomInt(0, WORKING_SIZE)
			const y2 = randomInt(0, WORKING_SIZE)

			const colors = ['#ff0000', '#00ff00', '#ffff00', '#00ffff', '#ffffff']

			svgParts.push(`
				<line
					x1="${x1}"
					y1="${y1}"
					x2="${x2}"
					y2="${y2}"
					stroke="${colors[randomInt(0, colors.length - 1)]}"
					stroke-width="${randomInt(1, 4)}"
					stroke-linecap="round"
					opacity="${random(0.3, 0.8)}"
				/>
			`)
		}
	}

	// youtube progress bar
	if (Math.random() < 0.08) {
		const height = randomInt(2, 6)

		svgParts.push(`
			<rect
				x="0"
				y="${WORKING_SIZE - height}"
				width="${randomInt(Math.floor(WORKING_SIZE * 0.2), Math.floor(WORKING_SIZE * 0.95))}"
				height="${height}"
				fill="#ff0000"
				opacity="0.9"
			/>
		`)
	}

	// random highlight box
	if (Math.random() < 0.08) {
		const size = randomInt(10, 30)

		svgParts.push(`
			<rect
				x="${randomInt(0, WORKING_SIZE - size)}"
				y="${randomInt(0, WORKING_SIZE - size)}"
				width="${size}"
				height="${size}"
				fill="none"
				stroke="#ffff00"
				stroke-width="2"
				opacity="0.7"
			/>
		`)
	}

	// mobile gesture bar
	if (Math.random() < 0.05) {
		svgParts.push(`
			<rect
				x="${WORKING_SIZE * 0.2}"
				y="${WORKING_SIZE - 8}"
				width="${WORKING_SIZE * 0.6}"
				height="4"
				rx="2"
				fill="#ffffff"
				opacity="0.8"
			/>
		`)
	}

	if (Math.random() < 0.1) {
		const w = randomInt(5, 20)
		const h = randomInt(5, 20)

		svgParts.push(`
		<rect
			x="${randomInt(0, WORKING_SIZE - w)}"
			y="${randomInt(0, WORKING_SIZE - h)}"
			width="${w}"
			height="${h}"
			fill="#000000"
			opacity="${random(0.15, 0.4)}"
		/>
	`)
	}

	if (svgParts.length === 0) {
		return image
	}

	const svg = Buffer.from(`
		<svg width="${WORKING_SIZE}" height="${WORKING_SIZE}">
			${svgParts.join('\n')}
		</svg>
	`)

	return sharp(image)
		.composite([
			{
				input: svg,
			},
		])
		.png()
		.toBuffer()
}
