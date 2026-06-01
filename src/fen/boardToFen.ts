import { Board, CastlingRights, Piece, PieceColor } from '../types'
import { castlingRightsToFen, pieceToFen } from '../util'

export const ALL_CASTLING_RIGHTS =
	CastlingRights.WhiteKing |
	CastlingRights.WhiteQueen |
	CastlingRights.BlackKing |
	CastlingRights.BlackQueen

export function boardToFen(
	board: Board,
	toMove: PieceColor = Piece.White,
	castlingRights: number = ALL_CASTLING_RIGHTS,
): string {
	let fen = ''

	for (let rank = 0; rank < 8; rank++) {
		let start = rank * 8
		let empty = 0

		for (let file = 0; file < 8; file++) {
			let piece: Piece = board[start + file]
			if (piece === Piece.Empty) {
				empty++
				continue
			}
			if (empty > 0) {
				fen += empty
				empty = 0
			}
			fen += pieceToFen(piece)
		}
		if (empty > 0) {
			fen += empty
		}
		if (rank !== 7) fen += '/'
	}

	fen += ' '

	//color to move
	if (toMove === Piece.White) fen += 'w'
	else fen += 'b'

	fen += ' '

	//castling rights
	const rights = castlingRightsToFen(castlingRights)
	fen += rights

	fen += ' - '
	fen += '0 1'

	return fen
}
