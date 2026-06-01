import { Board, Piece, PieceColor, PieceLiteral, PieceType } from './types'

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
	const color = piece & (Piece.White | Piece.Black)

	return piece === Piece.Empty || color === Piece.White || color === Piece.Black
}

export function makeWhite(type: Piece): Piece {
	return (type | Piece.White) as Piece
}

export function makeBlack(type: Piece): Piece {
	return (type | Piece.Black) as Piece
}
