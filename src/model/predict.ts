import * as ort from 'onnxruntime-node'
import { Prediction, RawImage } from '../types'
import { createBatchTensor } from './imageDataToTensor'

function softmax(logits: number[]): number[] {
	const max = Math.max(...logits)

	const exps = logits.map((x) => Math.exp(x - max))
	const sum = exps.reduce((a, b) => a + b, 0)

	return exps.map((x) => x / sum)
}

function decodePrediction(logits: Float32Array): Prediction {
	const probs = softmax([...logits])

	let bestClass = 0
	let bestConfidence = probs[0]

	for (let i = 1; i < probs.length; i++) {
		if (probs[i] > bestConfidence) {
			bestClass = i
			bestConfidence = probs[i]
		}
	}

	return {
		classId: bestClass,
		confidence: bestConfidence,
	}
}

export async function predictSquares(
	session: ort.InferenceSession,
	images: RawImage[],
): Promise<Prediction[]> {
	const input = createBatchTensor(images)

	const result = await session.run({
		input,
	})

	const outputName = session.outputNames[0]
	const output = result[outputName]

	const data = output.data as Float32Array

	if (output.dims.length !== 2) {
		throw new Error(`Expected output shape [batch, classes], got [${output.dims.join(', ')}]`)
	}

	const batchSize = output.dims[0]
	const numClasses = output.dims[1]

	const predictions: Prediction[] = []

	for (let batch = 0; batch < batchSize; batch++) {
		const start = batch * numClasses
		const end = start + numClasses

		const logits = data.slice(start, end)

		predictions.push(decodePrediction(logits))
	}

	return predictions
}
