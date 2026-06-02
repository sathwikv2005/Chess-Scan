import * as ort from 'onnxruntime-node'

let session: ort.InferenceSession | null = null

export async function getBoardDetector() {
	if (!session) {
		session = await ort.InferenceSession.create('model/board-detection.onnx', {
			executionProviders: ['cpu'],
		})
	}

	return session
}
