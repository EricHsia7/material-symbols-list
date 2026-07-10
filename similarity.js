const fs = require('fs');
const path = require('path');
const { readFile } = require('./files.js');
const { gzipSync } = require('fflate');

async function main() {
  const outputDir = './dist';

  const similarity = await readFile(path.join(outputDir, 'similarity.json'));
  const compressedData = gzipSync(new TextEncoder().encode(similarity));
  await fs.promises.writeFile(path.join(outputDir, 'similarity.gz'), Buffer.from(compressedData));

  process.exit(0);
}

main();
