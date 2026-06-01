import { describe, expect, it } from 'vitest'

import { boardToFen, ALL_CASTLING_RIGHTS } from './boardToFen'
import { createBoard, makeBlack, makeWhite } from '../util'
import { CastlingRights, Piece } from '../types'

describe('boardToFen', () => {
	it('converts an empty board', () => {
		const board = createBoard()

		expect(boardToFen(board)).toBe('8/8/8/8/8/8/8/8 w KQkq - 0 1')
	})

	it('supports black to move', () => {
		const board = createBoard()

		expect(boardToFen(board, Piece.Black)).toBe('8/8/8/8/8/8/8/8 b KQkq - 0 1')
	})

	it('supports no castling rights', () => {
		const board = createBoard()

		expect(boardToFen(board, Piece.White, CastlingRights.NONE)).toBe('8/8/8/8/8/8/8/8 w - - 0 1')
	})

	it('supports partial castling rights', () => {
		const board = createBoard()

		expect(
			boardToFen(board, Piece.White, CastlingRights.WhiteKing | CastlingRights.BlackQueen),
		).toBe('8/8/8/8/8/8/8/8 w Kq - 0 1')
	})

	it('compresses empty squares correctly', () => {
		const board = createBoard()

		board[0] = makeWhite(Piece.Rook)
		board[7] = makeWhite(Piece.Rook)

		expect(boardToFen(board)).toBe('R6R/8/8/8/8/8/8/8 w KQkq - 0 1')
	})

	it('handles a rank with mixed pieces and empty squares', () => {
		const board = createBoard()

		board[0] = makeWhite(Piece.Rook)
		board[3] = makeWhite(Piece.King)
		board[7] = makeBlack(Piece.Rook)

		expect(boardToFen(board)).toBe('R2K3r/8/8/8/8/8/8/8 w KQkq - 0 1')
	})

	it('converts the standard starting position', () => {
		const board = createBoard()

		// Rank 8
		board[0] = makeBlack(Piece.Rook)
		board[1] = makeBlack(Piece.Knight)
		board[2] = makeBlack(Piece.Bishop)
		board[3] = makeBlack(Piece.Queen)
		board[4] = makeBlack(Piece.King)
		board[5] = makeBlack(Piece.Bishop)
		board[6] = makeBlack(Piece.Knight)
		board[7] = makeBlack(Piece.Rook)

		// Rank 7
		for (let i = 8; i < 16; i++) {
			board[i] = makeBlack(Piece.Pawn)
		}

		// Rank 2
		for (let i = 48; i < 56; i++) {
			board[i] = makeWhite(Piece.Pawn)
		}

		// Rank 1
		board[56] = makeWhite(Piece.Rook)
		board[57] = makeWhite(Piece.Knight)
		board[58] = makeWhite(Piece.Bishop)
		board[59] = makeWhite(Piece.Queen)
		board[60] = makeWhite(Piece.King)
		board[61] = makeWhite(Piece.Bishop)
		board[62] = makeWhite(Piece.Knight)
		board[63] = makeWhite(Piece.Rook)

		expect(boardToFen(board)).toBe('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1')
	})

	it('uses ALL_CASTLING_RIGHTS by default', () => {
		const board = createBoard()

		expect(boardToFen(board)).toContain(`w KQkq - 0 1`)
	})
})
