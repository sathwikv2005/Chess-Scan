# chess-scan

Convert chessboard screenshots and images into FEN notation using machine learning.

## Features

- Detects chessboards from screenshots and images
- Recognizes all chess pieces
- Generates valid FEN strings
- Supports local files, URLs, buffers, and raw image data

## Installation

```bash
npm install chess-scan
```

## Usage

### Generate FEN

```js
const { imageToFen } = require('chess-scan')

async function main() {
	const result = await imageToFen('board.png')

	console.log(result.fen)
}

main()
```

### Extract Board Image

```js
const { getBoardImg } = require('chess-scan')

async function main() {
	const board = await getBoardImg('board.png')

	console.log(board.width)
	console.log(board.height)
}
```

### Extract Individual Squares

```js
const { getSquareImgs } = require('chess-scan')

async function main() {
	const squares = await getSquareImgs('board.png')

	console.log(squares.length) // 64
}
```

## API

### imageToFen(input)

Detects the board, recognizes all pieces, and returns the resulting FEN.

```ts
imageToFen(input: ImageInput): Promise<{
        fen: string
        confusion: [{
            classId: number
            confidence: number
        },...]
}>
```

### getBoardImg(input)

Returns the detected chessboard as a normalized image.

```ts
getBoardImg(input: ImageInput): Promise<Buffer>
```

### getSquareImgs(input)

Returns all 64 board squares.

```ts
getSquareImgs(input: ImageInput): Promise<Buffer[]>
```

## Supported Inputs

The library accepts:

- Local file paths
- Image URLs
- Buffers
- Raw image data

## TypeScript

Type definitions are included automatically.

```ts
import { imageToFen } from 'chess-scan'
```

## Pipeline

The library uses a machine-learning pipeline consisting of:

1. Board detection
2. Board normalization
3. Square extraction
4. Piece classification
5. FEN generation

Performance depends on image quality, board visibility, and piece style.

## License

MIT
