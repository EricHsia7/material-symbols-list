const fs = require('fs');
const path = require('path');
const { readFile } = require('./files.js');
const { gzip } = require('pako');

async function main() {
  const outputDir = './dist';

  const similarity = await readFile(path.join(outputDir, 'similarity.json'));
  const compressedData = gzip(similarity);
  await fs.promises.writeFile(path.join(outputDir, 'similarity.gz'), Buffer.from(compressedData));

  process.exit(0);
}

main();
