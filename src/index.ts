import { ImageInput } from './types'

export interface ScanResult {
	fen: string
	confidence: number
}

export async function imageToFen(image: ImageInput): Promise<ScanResult> {
	throw new Error('Works')
}
