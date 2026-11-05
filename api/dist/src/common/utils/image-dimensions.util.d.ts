export interface ImageDimensions {
    width: number;
    height: number;
    mimeType: string;
    megapixels: number;
}
export declare function extractImageDimensions(buffer: Buffer): ImageDimensions | null;
export declare function extractDimensionsFromFile(filePath: string): ImageDimensions | null;
