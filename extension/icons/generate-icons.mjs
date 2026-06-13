// Generates the extension's PNG icons from scratch — no image libraries, no
// network. Run with `node extension/icons/generate-icons.mjs`. The icons are
// committed; this script just makes them reproducible. A magnifying glass over
// a document, in the app accent blue, echoing "look closely at the fine print".
import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));

const ACCENT = [26, 95, 180]; // --accent #1a5fb4
const PAPER = [255, 255, 255];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'latin1');
  const body = Buffer.concat([typeBuf, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePng(size, pixels) {
  // pixels: Uint8Array of size*size*4 (RGBA)
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // 10,11,12 = compression, filter, interlace = 0
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0; // filter type none
    pixels.subarray(y * stride, y * stride + stride).forEach((v, i) => {
      raw[y * (stride + 1) + 1 + i] = v;
    });
  }
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function draw(size) {
  const px = new Uint8Array(size * size * 4);
  const set = (x, y, [r, g, b], a = 255) => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    px[i] = r;
    px[i + 1] = g;
    px[i + 2] = b;
    px[i + 3] = a;
  };
  const s = size;
  const radius = s * 0.18; // rounded-square corner radius
  // Rounded accent background.
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const inCorner =
        (x < radius && y < radius && Math.hypot(radius - x, radius - y) > radius) ||
        (x > s - radius && y < radius && Math.hypot(x - (s - radius), radius - y) > radius) ||
        (x < radius && y > s - radius && Math.hypot(radius - x, y - (s - radius)) > radius) ||
        (x > s - radius && y > s - radius && Math.hypot(x - (s - radius), y - (s - radius)) > radius);
      if (!inCorner) set(x, y, ACCENT);
    }
  }
  // Magnifying glass: a ring + handle in white.
  const cx = s * 0.42;
  const cy = s * 0.42;
  const rOuter = s * 0.24;
  const rInner = s * 0.15;
  const ringWidth = Math.max(1, s * 0.02);
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const d = Math.hypot(x - cx, y - cy);
      if (d <= rOuter && d >= rInner) set(x, y, PAPER);
    }
  }
  // Handle from lower-right of the ring.
  const hx0 = cx + rOuter * 0.7;
  const hy0 = cy + rOuter * 0.7;
  const hx1 = s * 0.82;
  const hy1 = s * 0.82;
  const steps = s * 2;
  for (let t = 0; t <= steps; t++) {
    const f = t / steps;
    const x = hx0 + (hx1 - hx0) * f;
    const y = hy0 + (hy1 - hy0) * f;
    for (let oy = -ringWidth; oy <= ringWidth; oy++)
      for (let ox = -ringWidth; ox <= ringWidth; ox++) set(Math.round(x + ox), Math.round(y + oy), PAPER);
  }
  return px;
}

for (const size of [16, 32, 48, 128]) {
  const png = encodePng(size, draw(size));
  writeFileSync(join(here, `icon-${size}.png`), png);
  console.log(`wrote icon-${size}.png (${png.length} bytes)`);
}
