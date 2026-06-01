import { describe, expect, it } from 'vitest'
import {
	getColor,
	isWhite,
	getType,
	pieceToFen,
	createBoard,
	isValidPiece,
	makeWhite,
	makeBlack,
	castlingRightsToFen,
} from './util'

import { CastlingRights, Piece } from './types'

describe('getColor', () => {
	it('returns null for empty square', () => {
		expect(getColor(Piece.Empty)).toBeNull()
	})

	it('returns white for white pieces', () => {
		expect(getColor(makeWhite(Piece.Pawn))).toBe(Piece.White)
		expect(getColor(makeWhite(Piece.King))).toBe(Piece.White)
	})

	it('returns black for black pieces', () => {
		expect(getColor(makeBlack(Piece.Pawn))).toBe(Piece.Black)
		expect(getColor(makeBlack(Piece.King))).toBe(Piece.Black)
	})
})

describe('isWhite', () => {
	it('returns true for white pieces', () => {
		expect(isWhite(makeWhite(Piece.Pawn))).toBe(true)
		expect(isWhite(makeWhite(Piece.King))).toBe(true)
	})

	it('returns false for black pieces', () => {
		expect(isWhite(makeBlack(Piece.Pawn))).toBe(false)
		expect(isWhite(makeBlack(Piece.King))).toBe(false)
	})

	it('returns false for empty square', () => {
		expect(isWhite(Piece.Empty)).toBe(false)
	})
})

describe('getType', () => {
	it('extracts piece type from white pieces', () => {
		expect(getType(makeWhite(Piece.Pawn))).toBe(Piece.Pawn)
		expect(getType(makeWhite(Piece.Knight))).toBe(Piece.Knight)
		expect(getType(makeWhite(Piece.Bishop))).toBe(Piece.Bishop)
		expect(getType(makeWhite(Piece.Rook))).toBe(Piece.Rook)
		expect(getType(makeWhite(Piece.Queen))).toBe(Piece.Queen)
		expect(getType(makeWhite(Piece.King))).toBe(Piece.King)
	})

	it('extracts piece type from black pieces', () => {
		expect(getType(makeBlack(Piece.Pawn))).toBe(Piece.Pawn)
		expect(getType(makeBlack(Piece.Knight))).toBe(Piece.Knight)
		expect(getType(makeBlack(Piece.Bishop))).toBe(Piece.Bishop)
		expect(getType(makeBlack(Piece.Rook))).toBe(Piece.Rook)
		expect(getType(makeBlack(Piece.Queen))).toBe(Piece.Queen)
		expect(getType(makeBlack(Piece.King))).toBe(Piece.King)
	})

	it('returns empty for empty square', () => {
		expect(getType(Piece.Empty)).toBe(Piece.Empty)
	})
})

describe('pieceToFen', () => {
	it('converts white pieces to FEN', () => {
		expect(pieceToFen(makeWhite(Piece.Pawn))).toBe('P')
		expect(pieceToFen(makeWhite(Piece.Knight))).toBe('N')
		expect(pieceToFen(makeWhite(Piece.Bishop))).toBe('B')
		expect(pieceToFen(makeWhite(Piece.Rook))).toBe('R')
		expect(pieceToFen(makeWhite(Piece.Queen))).toBe('Q')
		expect(pieceToFen(makeWhite(Piece.King))).toBe('K')
	})

	it('converts black pieces to FEN', () => {
		expect(pieceToFen(makeBlack(Piece.Pawn))).toBe('p')
		expect(pieceToFen(makeBlack(Piece.Knight))).toBe('n')
		expect(pieceToFen(makeBlack(Piece.Bishop))).toBe('b')
		expect(pieceToFen(makeBlack(Piece.Rook))).toBe('r')
		expect(pieceToFen(makeBlack(Piece.Queen))).toBe('q')
		expect(pieceToFen(makeBlack(Piece.King))).toBe('k')
	})

	it('returns empty string for empty square', () => {
		expect(pieceToFen(Piece.Empty)).toBe('')
	})

	it('throws for invalid piece type', () => {
		expect(() => pieceToFen(255 as Piece)).toThrow()
	})
})

describe('createBoard', () => {
	it('creates an empty board', () => {
		const board = createBoard()

		expect(board).toBeInstanceOf(Uint8Array)
		expect(board.length).toBe(64)

		for (const square of board) {
			expect(square).toBe(Piece.Empty)
		}
	})
})

describe('isValidPiece', () => {
	it('accepts empty square', () => {
		expect(isValidPiece(Piece.Empty)).toBe(true)
	})

	it('accepts all white pieces', () => {
		expect(isValidPiece(makeWhite(Piece.Pawn))).toBe(true)
		expect(isValidPiece(makeWhite(Piece.King))).toBe(true)
	})

	it('accepts all black pieces', () => {
		expect(isValidPiece(makeBlack(Piece.Pawn))).toBe(true)
		expect(isValidPiece(makeBlack(Piece.King))).toBe(true)
	})

	it('rejects pieces without color', () => {
		expect(isValidPiece(Piece.Pawn)).toBe(false)
		expect(isValidPiece(Piece.King)).toBe(false)
	})

	it('rejects completely invalid values', () => {
		expect(isValidPiece(255)).toBe(false)
		expect(isValidPiece(99)).toBe(false)
	})
})

describe('makeWhite', () => {
	it('adds white color bit', () => {
		expect(makeWhite(Piece.Pawn)).toBe(Piece.Pawn | Piece.White)
		expect(makeWhite(Piece.King)).toBe(Piece.King | Piece.White)
	})
})

describe('makeBlack', () => {
	it('adds black color bit', () => {
		expect(makeBlack(Piece.Pawn)).toBe(Piece.Pawn | Piece.Black)
		expect(makeBlack(Piece.King)).toBe(Piece.King | Piece.Black)
	})
})

describe('castlingRightsToFen', () => {
	it('returns "-" when no castling rights exist', () => {
		expect(castlingRightsToFen(CastlingRights.NONE)).toBe('-')
	})

	it('returns white king side', () => {
		expect(castlingRightsToFen(CastlingRights.WhiteKing)).toBe('K')
	})

	it('returns white queen side', () => {
		expect(castlingRightsToFen(CastlingRights.WhiteQueen)).toBe('Q')
	})

	it('returns black king side', () => {
		expect(castlingRightsToFen(CastlingRights.BlackKing)).toBe('k')
	})

	it('returns black queen side', () => {
		expect(castlingRightsToFen(CastlingRights.BlackQueen)).toBe('q')
	})

	it('returns combined rights in correct FEN order', () => {
		expect(
			castlingRightsToFen(
				CastlingRights.WhiteKing |
					CastlingRights.WhiteQueen |
					CastlingRights.BlackKing |
					CastlingRights.BlackQueen,
			),
		).toBe('KQkq')
	})

	it('returns partial combinations correctly', () => {
		expect(castlingRightsToFen(CastlingRights.WhiteKing | CastlingRights.BlackQueen)).toBe('Kq')

		expect(castlingRightsToFen(CastlingRights.WhiteQueen | CastlingRights.BlackKing)).toBe('Qk')
	})
})
