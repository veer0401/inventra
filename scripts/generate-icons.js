import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const iconsDir = path.resolve(__dirname, '../apps/desktop/src-tauri/icons');
fs.mkdirSync(iconsDir, { recursive: true });

// Minimal 1x1 RGBA PNG buffer creator with specific dimensions
import zlib from 'zlib';

function createPng(width, height, r = 15, g = 23, b = 42, a = 255) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // bit depth 8
  ihdrData.writeUInt8(6, 9); // RGBA
  ihdrData.writeUInt8(0, 10); // compression
  ihdrData.writeUInt8(0, 11); // filter
  ihdrData.writeUInt8(0, 12); // interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Raw image scanlines
  const rowSize = width * 4 + 1;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData.writeUInt8(0, rowOffset); // filter type: none

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 4;
      // Draw a cross in the center
      const cx = width / 2;
      const cy = height / 2;
      const arm = width * 0.15;
      const isCross = (Math.abs(x - cx) < arm && Math.abs(y - cy) < width * 0.35) ||
                      (Math.abs(y - cy) < arm && Math.abs(x - cx) < width * 0.35);

      if (isCross) {
        rawData.writeUInt8(16, pxOffset);     // R (Emerald)
        rawData.writeUInt8(185, pxOffset + 1); // G
        rawData.writeUInt8(129, pxOffset + 2); // B
        rawData.writeUInt8(255, pxOffset + 3); // A
      } else {
        rawData.writeUInt8(r, pxOffset);     // Dark Slate
        rawData.writeUInt8(g, pxOffset + 1);
        rawData.writeUInt8(b, pxOffset + 2);
        rawData.writeUInt8(a, pxOffset + 3);
      }
    }
  }

  const idatData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', idatData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuf = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuf, data]);
  const crc = crc32(crcData);

  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);

  return Buffer.concat([length, typeBuf, data, crcBuf]);
}

// CRC32 implementation
const crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1);
    } else {
      c = c >>> 1;
    }
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

// Create minimal ICO file containing PNGs
function createIco(pngBuffers) {
  const count = pngBuffers.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // ICO type
  header.writeUInt16LE(count, 4); // count

  const dirEntries = [];
  let offset = 6 + count * 16;

  for (const { width, height, buffer } of pngBuffers) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(width >= 256 ? 0 : width, 0);
    entry.writeUInt8(height >= 256 ? 0 : height, 1);
    entry.writeUInt8(0, 2); // color palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(buffer.length, 8); // size of image data
    entry.writeUInt32LE(offset, 12); // offset

    dirEntries.push(entry);
    offset += buffer.length;
  }

  return Buffer.concat([header, ...dirEntries, ...pngBuffers.map(p => p.buffer)]);
}

// Generate PNGs
const png32 = createPng(32, 32);
const png128 = createPng(128, 128);
const png256 = createPng(256, 256);
const png512 = createPng(512, 512);

fs.writeFileSync(path.join(iconsDir, '32x32.png'), png32);
fs.writeFileSync(path.join(iconsDir, '128x128.png'), png128);
fs.writeFileSync(path.join(iconsDir, '128x128@2x.png'), png256);
fs.writeFileSync(path.join(iconsDir, 'icon.png'), png512);

const ico = createIco([
  { width: 32, height: 32, buffer: png32 },
  { width: 128, height: 128, buffer: png128 },
  { width: 256, height: 256, buffer: png256 },
]);
fs.writeFileSync(path.join(iconsDir, 'icon.ico'), ico);

// Minimal ICNS (macOS) placeholder
fs.writeFileSync(path.join(iconsDir, 'icon.icns'), Buffer.from('icns\x00\x00\x00\x00'));

console.log('Tauri icon assets generated successfully in:', iconsDir);
