import * as ort from 'onnxruntime-node'
import path from 'path'

const modelUrl = path.join(__dirname, '../../model/board-detection.onnx')

let session: ort.InferenceSession | null = null

export async function getBoardDetector() {
	if (!session) {
		session = await ort.InferenceSession.create(modelUrl, {
			executionProviders: ['cpu'],
		})
	}

	return session
}
