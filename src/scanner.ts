import { predictSquares } from './model/predict'
import sharp from 'sharp'
import path from 'path'
import { ImageInput, Prediction, RawImage, ScanResult } from './types'
import * as ort from 'onnxruntime-node'
import { convertPrediction, createBoard } from './util'
import { boardToFen } from './fen/boardToFen'
import { getBoard, getSquares, saveDebugImages } from './board/getBoard'

const modelUrl = path.join(__dirname, '../model/chess-piece_3.onnx')

let sessionPromise: Promise<ort.InferenceSession> | null = null

function getSession() {
	if (!sessionPromise) {
		sessionPromise = ort.InferenceSession.create(modelUrl)
	}

	return sessionPromise
}

export async function rawImageToBuffer(
	image: RawImage,
	format: 'png' | 'jpeg' = 'png',
): Promise<Buffer> {
	return sharp(image.data, {
		raw: {
			width: image.width,
			height: image.height,
			channels: 4,
		},
	})
		.toFormat(format)
		.toBuffer()
}

export async function imageToFen(image: ImageInput): Promise<ScanResult> {
	const session = await getSession()

	// const boardImg = await getBoard(image)

	const squares = await getSquares(image)

	// saveDebugImages(boardImg, squares)

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

export async function getBoardImg(image: ImageInput): Promise<Buffer> {
	const board = await getBoard(image)

	return rawImageToBuffer(board)
}

export async function getSquareImgs(image: ImageInput): Promise<Buffer[]> {
	const squares = await getSquares(image)

	return Promise.all(squares.map((square) => rawImageToBuffer(square)))
}

// imageToFen('training/datasets/example.png').then((res) => console.log(res.fen))
