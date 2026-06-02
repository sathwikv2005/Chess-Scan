import { predictSquares } from './model/predict'
import { ImageInput, Prediction } from './types'
import * as ort from 'onnxruntime-node'
import { convertPrediction, createBoard } from './util'
import { boardToFen } from './fen/boardToFen'
import { getBoard, getSquares, saveDebugImages } from './board/getBoard'

const modelUrl = 'model/chess-piece_3.onnx'
export interface ScanResult {
	fen: string
	confidence: Prediction[]
}

export async function imageToFen(image: ImageInput): Promise<ScanResult> {
	const session = await ort.InferenceSession.create(modelUrl)

	const boardImg = await getBoard(image)

	const squares = await getSquares(image)

	saveDebugImages(boardImg, squares)

	const predictions = await predictSquares(session, squares)

	var board = createBoard()

	for (var i = 0; i < 64; i++) {
		board[i] = convertPrediction(predictions[i].classId)
	}

	const fen = boardToFen(board)

	return {
		fen: fen,
		confidence: predictions,
	}
}

imageToFen('training/datasets/example11.png').then((res) => console.log(res.fen))
