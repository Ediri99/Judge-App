// One-off generator for placeholder PWA/app icons (solid-color PNGs encoded
// by hand via zlib, no image library dependency). Replace with real branded
// assets when the client provides them — see PROGRESS.md Phase 8 notes.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const GOLD = [0xb0, 0x7d, 0x24];
const GOLD_DEEP = [0x7e, 0x58, 0x10];
const CREAM = [0xf3, 0xe7, 0xcc];

function crc32(buf) {
  let c;
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
      c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      t[n] = c >>> 0;
    }
    return t;
  })());
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function pixelAt(x, y, size) {
  const margin = Math.round(size * 0.12);
  const inner = margin * 2.2;
  if (x < margin || y < margin || x >= size - margin || y >= size - margin) {
    return GOLD_DEEP;
  }
  if (x < inner || y < inner || x >= size - inner || y >= size - inner) {
    return GOLD;
  }
  return CREAM;
}

function buildPng(size) {
  const rowBytes = size * 3 + 1;
  const raw = Buffer.alloc(rowBytes * size);
  for (let y = 0; y < size; y++) {
    const rowStart = y * rowBytes;
    raw[rowStart] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixelAt(x, y, size);
      const offset = rowStart + 1 + x * 3;
      raw[offset] = r;
      raw[offset + 1] = g;
      raw[offset + 2] = b;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type: truecolor
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const idat = zlib.deflateSync(raw);
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

  return Buffer.concat([
    signature,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, '..', 'public');
fs.mkdirSync(outDir, { recursive: true });

const targets = [
  ['favicon.png', 32],
  ['apple-touch-icon.png', 180],
  ['pwa-192x192.png', 192],
  ['pwa-512x512.png', 512],
];

for (const [name, size] of targets) {
  fs.writeFileSync(path.join(outDir, name), buildPng(size));
  console.log(`wrote public/${name} (${size}x${size})`);
}
