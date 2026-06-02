import * as ort from 'onnxruntime-node'
import { RawImage } from '../types'

function imageDataToTensor(image: RawImage): Float32Array {
	const { data, width, height } = image

	const tensor = new Float32Array(3 * width * height)
	const channelSize = width * height

	for (let i = 0; i < channelSize; i++) {
		const pixel = i * 4

		tensor[i] = data[pixel] / 255
		tensor[channelSize + i] = data[pixel + 1] / 255
		tensor[channelSize * 2 + i] = data[pixel + 2] / 255
	}

	return tensor
}

export function createBatchTensor(images: RawImage[]) {
	if (images.length === 0) {
		throw new Error('No images provided')
	}

	const width = images[0].width
	const height = images[0].height

	const singleSize = 3 * width * height
	const batch = new Float32Array(images.length * singleSize)

	for (let i = 0; i < images.length; i++) {
		const image = images[i]

		if (image.width !== width || image.height !== height) {
			throw new Error(`Image ${i} has different dimensions (${image.width}x${image.height})`)
		}

		batch.set(imageDataToTensor(image), i * singleSize)
	}

	return new ort.Tensor('float32', batch, [images.length, 3, height, width])
}
