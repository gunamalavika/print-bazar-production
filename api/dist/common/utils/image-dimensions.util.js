"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractImageDimensions = extractImageDimensions;
exports.extractDimensionsFromFile = extractDimensionsFromFile;
const fs = require("fs");
function extractImageDimensions(buffer) {
    if (!buffer || buffer.length < 24)
        return null;
    try {
        if (buffer[0] === 0x89 &&
            buffer[1] === 0x50 &&
            buffer[2] === 0x4e &&
            buffer[3] === 0x47 &&
            buffer[4] === 0x0d &&
            buffer[5] === 0x0a &&
            buffer[6] === 0x1a &&
            buffer[7] === 0x0a) {
            const width = buffer.readUInt32BE(16);
            const height = buffer.readUInt32BE(20);
            const megapixels = Math.round(((width * height) / 1_000_000) * 100) / 100;
            return { width, height, mimeType: 'image/png', megapixels };
        }
        if (buffer[0] === 0x47 &&
            buffer[1] === 0x49 &&
            buffer[2] === 0x46 &&
            buffer[3] === 0x38 &&
            (buffer[4] === 0x37 || buffer[4] === 0x39) &&
            buffer[5] === 0x61) {
            const width = buffer.readUInt16LE(6);
            const height = buffer.readUInt16LE(8);
            const megapixels = Math.round(((width * height) / 1_000_000) * 100) / 100;
            return { width, height, mimeType: 'image/gif', megapixels };
        }
        if (buffer[0] === 0x52 &&
            buffer[1] === 0x49 &&
            buffer[2] === 0x46 &&
            buffer[3] === 0x46 &&
            buffer[8] === 0x57 &&
            buffer[9] === 0x45 &&
            buffer[10] === 0x42 &&
            buffer[11] === 0x50) {
            if (buffer.slice(12, 16).toString('ascii') === 'VP8X' && buffer.length >= 30) {
                const width = 1 + buffer.readUIntLE(24, 3);
                const height = 1 + buffer.readUIntLE(27, 3);
                const megapixels = Math.round(((width * height) / 1_000_000) * 100) / 100;
                return { width, height, mimeType: 'image/webp', megapixels };
            }
            if (buffer.slice(12, 16).toString('ascii') === 'VP8L' && buffer.length >= 25) {
                const b0 = buffer[21];
                const b1 = buffer[22];
                const b2 = buffer[23];
                const b3 = buffer[24];
                const width = 1 + (((b1 & 0x3f) << 8) | b0);
                const height = 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6));
                const megapixels = Math.round(((width * height) / 1_000_000) * 100) / 100;
                return { width, height, mimeType: 'image/webp', megapixels };
            }
            if (buffer.slice(12, 16).toString('ascii') === 'VP8 ' && buffer.length >= 30) {
                const width = buffer.readUInt16LE(26) & 0x3fff;
                const height = buffer.readUInt16LE(28) & 0x3fff;
                const megapixels = Math.round(((width * height) / 1_000_000) * 100) / 100;
                return { width, height, mimeType: 'image/webp', megapixels };
            }
        }
        if (buffer[0] === 0xff && buffer[1] === 0xd8) {
            let offset = 2;
            while (offset < buffer.length) {
                if (buffer[offset] !== 0xff) {
                    offset++;
                    continue;
                }
                const marker = buffer[offset + 1];
                if ((marker >= 0xc0 && marker <= 0xc3) ||
                    (marker >= 0xc5 && marker <= 0xc7) ||
                    (marker >= 0xc9 && marker <= 0xcb) ||
                    (marker >= 0xcd && marker <= 0xcf)) {
                    const height = buffer.readUInt16BE(offset + 5);
                    const width = buffer.readUInt16BE(offset + 7);
                    const megapixels = Math.round(((width * height) / 1_000_000) * 100) / 100;
                    return { width, height, mimeType: 'image/jpeg', megapixels };
                }
                if (offset + 3 >= buffer.length)
                    break;
                const length = buffer.readUInt16BE(offset + 2);
                offset += 2 + length;
            }
        }
    }
    catch (err) {
        return null;
    }
    return null;
}
function extractDimensionsFromFile(filePath) {
    try {
        if (!fs.existsSync(filePath))
            return null;
        const buffer = fs.readFileSync(filePath);
        return extractImageDimensions(buffer);
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=image-dimensions.util.js.map