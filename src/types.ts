export enum Piece {
	Empty = 0,

	Pawn = 1,
	Knight = 2,
	Bishop = 3,
	Rook = 4,
	Queen = 5,
	King = 6,

	Mask = 7,

	White = 8,
	Black = 16,
}

export type PieceType =
	| Piece.Pawn
	| Piece.Knight
	| Piece.Bishop
	| Piece.Rook
	| Piece.Queen
	| Piece.King
	| Piece.Empty

export type PieceColor = Piece.White | Piece.Black

export type PieceLiteral =
	| 'P'
	| 'N'
	| 'B'
	| 'R'
	| 'Q'
	| 'K'
	| 'p'
	| 'n'
	| 'b'
	| 'r'
	| 'q'
	| 'k'
	| ''

export type Board = Uint8Array

export enum CastlingRights {
	NONE = 0,
	WhiteKing = 1,
	WhiteQueen = 2,
	BlackKing = 4,
	BlackQueen = 8,
	ALL = 15,
}

export type ImageInput = string | Buffer

export interface Prediction {
	classId: number
	confidence: number
}

export interface RawImage {
	width: number
	height: number
	data: Uint8ClampedArray
}
