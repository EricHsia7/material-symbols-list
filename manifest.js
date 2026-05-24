const fs = require('fs');
const path = require('path');
const { readFile, writeTextFile } = require('./files.js');
const { sha256, md5, sha512 } = require('./hash.js');

async function main() {
  const outputDir = './dist';

  const search_index = await readFile(path.join(outputDir, 'search-index.json'));
  const index = await readFile(path.join(outputDir, 'index.json'));
  const similarity = await readFile(path.join(outputDir, 'similarity.json'));

  const manifest = {
    search_index: {
      raw: 'https://erichsia7.github.io/material-symbols-list/search-index.json',
      compressed: 'https://erichsia7.github.io/material-symbols-list/search-index.gz',
      md5: md5(search_index),
      sha256: sha256(search_index),
      sha512: sha512(search_index)
    },
    index: {
      raw: 'https://erichsia7.github.io/material-symbols-list/index.json',
      compressed: 'https://erichsia7.github.io/material-symbols-list/index.gz',
      md5: md5(index),
      sha256: sha256(index),
      sha512: sha512(index)
    },
    similarity: {
      raw: 'https://erichsia7.github.io/material-symbols-list/similarity.json',
      compressed: 'https://erichsia7.github.io/material-symbols-list/similarity.gz',
      md5: md5(similarity),
      sha256: sha256(similarity),
      sha512: sha512(similarity)
    }
  };

  await writeTextFile(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  process.exit(0);
}

main();
