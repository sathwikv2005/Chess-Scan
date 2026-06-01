export interface ScanResult {
	fen: string
	confidence: number
}

export async function imageToFen(image: string | Buffer): Promise<ScanResult> {
	throw new Error('Works')
}
