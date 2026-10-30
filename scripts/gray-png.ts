import { crc32, deflateSync } from 'zlib';

/**
 * Encodes 8-bit greyscale pixels as a 1/2/4-bit greyscale PNG. sharp only
 * writes sub-8-bit depths as palette PNGs; TRMNL firmware expects plain
 * greyscale. Pixels are rounded to the nearest of the 2^bitDepth levels.
 */
export function encodeGrayPng(
  pixels: Uint8Array,
  width: number,
  height: number,
  bitDepth: 1 | 2 | 4,
): Buffer {
  const maxLevel = (1 << bitDepth) - 1;
  const perByte = 8 / bitDepth;
  const stride = Math.ceil(width / perByte);
  // Each scanline: filter byte (0 = none) + packed pixels, MSB first
  const raw = Buffer.alloc((stride + 1) * height);

  for (let y = 0; y < height; y++) {
    const row = y * (stride + 1) + 1;
    for (let x = 0; x < width; x++) {
      const level = Math.round((pixels[y * width + x] / 255) * maxLevel);
      const shift = 8 - bitDepth * ((x % perByte) + 1);
      raw[row + Math.floor(x / perByte)] |= level << shift;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = bitDepth;
  ihdr[9] = 0; // colour type: greyscale

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function chunk(type: string, data: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, crc]);
}
