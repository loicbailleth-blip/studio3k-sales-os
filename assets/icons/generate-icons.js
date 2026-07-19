/* Génère les icônes PWA (PNG) sans dépendance externe : encodeur PNG minimal + police pixel-art "3K".
   À exécuter une seule fois (node generate-icons.js) ; les PNG produits sont ensuite versionnés normalement. */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const CHARBON = [0x16, 0x15, 0x13];
const LAITON = [0xb8, 0x96, 0x5a];

// Police pixel 5x7 : uniquement les glyphes nécessaires ("3" et "K")
const GLYPHS = {
  "3": ["01110", "10001", "00001", "00110", "00001", "10001", "01110"],
  "K": ["10001", "10010", "10100", "11000", "10100", "10010", "10001"]
};

function makeCanvas(size){
  const px = new Uint8Array(size * size * 4);
  return px;
}
function setPx(px, size, x, y, [r, g, b], a = 255){
  if(x < 0 || y < 0 || x >= size || y >= size) return;
  const i = (y * size + x) * 4;
  px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a;
}

function drawRoundedSquare(px, size, radius, color){
  for(let y = 0; y < size; y++){
    for(let x = 0; x < size; x++){
      const inTL = x < radius && y < radius && Math.hypot(radius - x, radius - y) > radius;
      const inTR = x >= size - radius && y < radius && Math.hypot(x - (size - radius), radius - y) > radius;
      const inBL = x < radius && y >= size - radius && Math.hypot(radius - x, y - (size - radius)) > radius;
      const inBR = x >= size - radius && y >= size - radius && Math.hypot(x - (size - radius), y - (size - radius)) > radius;
      if(inTL || inTR || inBL || inBR) continue;
      setPx(px, size, x, y, color);
    }
  }
}

function drawGlyph(px, size, glyph, ox, oy, scale, color){
  for(let row = 0; row < glyph.length; row++){
    for(let col = 0; col < glyph[row].length; col++){
      if(glyph[row][col] === "1"){
        for(let sy = 0; sy < scale; sy++)
          for(let sx = 0; sx < scale; sx++)
            setPx(px, size, ox + col * scale + sx, oy + row * scale + sy, color);
      }
    }
  }
}

function drawMonogram(px, size, color){
  const scale = Math.max(2, Math.round(size / 40));
  const glyphW = 5 * scale, glyphH = 7 * scale, gap = Math.round(scale * 1.5);
  const totalW = glyphW * 2 + gap;
  const ox = Math.round((size - totalW) / 2);
  const oy = Math.round((size - glyphH) / 2);
  drawGlyph(px, size, GLYPHS["3"], ox, oy, scale, color);
  drawGlyph(px, size, GLYPHS["K"], ox + glyphW + gap, oy, scale, color);
}

function crc32(buf){
  let c, table = crc32.table;
  if(!table){
    table = crc32.table = [];
    for(let n = 0; n < 256; n++){
      c = n;
      for(let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
      table[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for(let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data){
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(px, size){
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for(let y = 0; y < size; y++){
    raw[y * (size * 4 + 1)] = 0; // filtre "none"
    px.copy ? null : null;
    for(let x = 0; x < size; x++){
      const si = (y * size + x) * 4;
      const di = y * (size * 4 + 1) + 1 + x * 4;
      raw[di] = px[si]; raw[di + 1] = px[si + 1]; raw[di + 2] = px[si + 2]; raw[di + 3] = px[si + 3];
    }
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0; // 8-bit RGBA
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

function buildIcon(size, { maskableSafe = false } = {}){
  const px = makeCanvas(size);
  drawRoundedSquare(px, size, maskableSafe ? 0 : Math.round(size * 0.18), CHARBON);
  const scaleFactor = maskableSafe ? 0.6 : 1; // zone de sécurité maskable Android (icône plus petite au centre)
  const monoSize = Math.round(size * scaleFactor);
  const offset = Math.round((size - monoSize) / 2);
  const subPx = makeCanvas(monoSize);
  drawMonogram(subPx, monoSize, LAITON);
  for(let y = 0; y < monoSize; y++){
    for(let x = 0; x < monoSize; x++){
      const si = (y * monoSize + x) * 4;
      if(subPx[si + 3] > 0) setPx(px, size, x + offset, y + offset, [subPx[si], subPx[si + 1], subPx[si + 2]]);
    }
  }
  return encodePNG(px, size);
}

const outDir = __dirname;
const targets = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "icon-512-maskable.png", size: 512, maskableSafe: true },
  { file: "apple-touch-icon.png", size: 180 },
  { file: "favicon-32.png", size: 32 }
];
targets.forEach(t => {
  const buf = buildIcon(t.size, { maskableSafe: t.maskableSafe });
  fs.writeFileSync(path.join(outDir, t.file), buf);
  console.log("Écrit", t.file, buf.length, "octets");
});
