import { Board, CastlingRights, Piece, PieceColor, PieceLiteral, PieceType } from './types'

export function getColor(piece: Piece): PieceColor | null {
	const color = piece & (Piece.White | Piece.Black)

	if (color === Piece.White || color === Piece.Black) {
		return color
	}

	return null //empty square
}

export function isWhite(piece: Piece): boolean {
	return (piece & Piece.White) !== 0
}

export function getType(piece: Piece): PieceType {
	return piece & Piece.Mask
}

export function pieceToFen(piece: Piece): PieceLiteral {
	if (piece === Piece.Empty) {
		return '' //empty square
	}

	const white = isWhite(piece)
	const type = getType(piece)

	switch (type) {
		case Piece.Pawn:
			if (white) return 'P'
			return 'p'
		case Piece.Rook:
			if (white) return 'R'
			return 'r'
		case Piece.Knight:
			if (white) return 'N'
			return 'n'
		case Piece.Bishop:
			if (white) return 'B'
			return 'b'
		case Piece.Queen:
			if (white) return 'Q'
			return 'q'
		case Piece.King:
			if (white) return 'K'
			return 'k'
		default:
			throw new Error(`Invalid piece value: ${piece}`)
	}
}

export function createBoard(): Board {
	return new Uint8Array(64)
}

export function isValidPiece(piece: number): boolean {
	if (piece === Piece.Empty) return true

	const color = piece & (Piece.White | Piece.Black)
	const type = piece & Piece.Mask

	const validColor = color === Piece.White || color === Piece.Black

	const validType = type >= Piece.Pawn && type <= Piece.King

	return validColor && validType
}

export function makeWhite(type: Piece): Piece {
	return (type | Piece.White) as Piece
}

export function makeBlack(type: Piece): Piece {
	return (type | Piece.Black) as Piece
}

export function castlingRightsToFen(castlingRights: number): string {
	let fen = ''

	if ((castlingRights & CastlingRights.WhiteKing) !== 0) fen += 'K'
	if ((castlingRights & CastlingRights.WhiteQueen) !== 0) fen += 'Q'
	if ((castlingRights & CastlingRights.BlackKing) !== 0) fen += 'k'
	if ((castlingRights & CastlingRights.BlackQueen) !== 0) fen += 'q'

	if (fen === '') return '-'
	return fen
}

/*
Classes:
{'Empty': 0, 'bB': 1, 'bK': 2, 'bN': 3, 'bP': 4, 'bQ': 5, 'bR': 6, 'wB': 7, 'wK': 8, 'wN': 9, 'wP': 10, 'wQ': 11, 'wR': 12}
*/
const CLASS_TO_PIECE: Piece[] = [
	Piece.Empty, // 0
	makeBlack(Piece.Bishop), // 1 bB
	makeBlack(Piece.King), // 2 bK
	makeBlack(Piece.Knight), // 3 bN
	makeBlack(Piece.Pawn), // 4 bP
	makeBlack(Piece.Queen), // 5 bQ
	makeBlack(Piece.Rook), // 6 bR
	makeWhite(Piece.Bishop), // 7 wB
	makeWhite(Piece.King), // 8 wK
	makeWhite(Piece.Knight), // 9 wN
	makeWhite(Piece.Pawn), // 10 wP
	makeWhite(Piece.Queen), // 11 wQ
	makeWhite(Piece.Rook), // 12 wR
]

export function convertPrediction(prediction: number): Piece {
	const piece = CLASS_TO_PIECE[prediction]

	if (piece === undefined) {
		throw new Error(`Invalid prediction class: ${prediction}`)
	}

	return piece
}
