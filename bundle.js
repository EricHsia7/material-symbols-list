const { getFiles, readFile } = require('./files');
const { Compress } = require('fflate');
const path = require('node:path');
const fs = require('node:fs');

function splitByLength(x, length = 3) {
  const chunks = [];
  const quantity = Math.ceil(x.length / length);
  for (let i = 0; i < quantity; i++) {
    chunks.push(x.slice(i * length, i * length + length));
  }
  return chunks;
}

function extractPath(svg) {
  const m = /<path d="(.*)"\/>/gms.exec(svg);
  if (m) {
    return `${m[1]}\n`;
  }
}

function concatChunks(chunks) {
  const size = chunks.reduce((n, c) => n + c.length, 0);
  const result = new Uint8Array(size);
  let pos = 0;
  for (const chunk of chunks) {
    result.set(chunk, pos);
    pos += chunk.length;
  }
  return result;
}

async function main() {
  const N = 64;
  const files = await getFiles('./tmp/material-symbols-main/svg/400/rounded');
  const chunks = splitByLength(files, N);

  const encoder = new TextEncoder();
  const defalter = new Compress();
  const deflatedChunks = [];
  defalter.ondata = (chunk, final) => {
    const output = chunk.slice();
    deflatedChunks.push(output);
  };

  const names = [];
  for (const chunk of chunks) {
    const content = await Promise.all(chunk.map((f) => readFile(f.path.full)));
    const name = chunk.map((f) => path.basename(f.path.name, path.extname(f.path.name)));
    const lines = new Array(N).fill('');
    for (let i = 0; i < content.length; i++) {
      if (name[i].endsWith('-fill')) continue;
      lines.push(extractPath(content[i]));
      names.push(name[i])
    }
    const buffer = encoder.encode(lines.join(''));
    defalter.push(buffer, false); // feed bytes incrementally
  }

  defalter.push(new Uint8Array(0), true); // final = true -> flush the tail

  const data = concatChunks(deflatedChunks);
  fs.writeFileSync('./tmp/bundled.gz', Buffer.from(data));
  fs.writeFileSync('./tmp/bundled.json', JSON.stringify(names));
}

main();
