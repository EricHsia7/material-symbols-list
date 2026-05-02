const fs = require('fs');
const path = require('path');
const { makeDirectory, writeTextFile, getFiles, readFile } = require('./files.js');
const { sha256, md5 } = require('./hash.js');
const pako = require('pako');
const emojiRegex = require('emoji-regex');

async function main() {
  const versions = require('./versions.json');
  const outputDir = './dist';
  await makeDirectory(outputDir);
  const tagFiles = await getFiles('./tags/');
  const synonymyFiles = await getFiles('./synonymies/');
  const frequencyMap = {};
  const list = [];
  const symbols = {};
  for (const file of tagFiles) {
    const extension = path.extname(file.path.name);
    const symbolName = path.basename(file.path.name, extension);
    if (!versions.hasOwnProperty(symbolName)) continue;
    const content = await readFile(file.path.full);
    const fileNameWords = symbolName.split('_');
    const fileContentWords = content.split(/[\n\s]+/g).filter((e) => e !== '');
    const allWords = fileNameWords.concat(fileContentWords).map((e) => e.toLowerCase());
    // Keep the semantic frequency
    for (const word of allWords) {
      if (!frequencyMap.hasOwnProperty(word)) {
        frequencyMap[word] = 0;
      }
      frequencyMap[word]++;
    }
    // Deduplicate
    const allWordsUnique = [];
    for (const word of allWords) {
      if (allWordsUnique.indexOf(word) < 0) {
        allWordsUnique.push(word);
      }
    }
    list.push(symbolName);
    symbols[symbolName] = allWordsUnique;
  }

  for (const file of synonymyFiles) {
    const extension = path.extname(file.path.name);
    const symbolName = path.basename(file.path.name, extension);
    if (!versions.hasOwnProperty(symbolName)) continue;
    const content = await readFile(file.path.full);
    const fileContentWords = content
      .split(/[;,\n\s\_\/]+/g)
      .filter((e) => e !== '' && !/\[[a-z0-9]+|(->)|[\u4E00-\u9FFF]+|[\~\*\{\}\!\#\@\$\`\>\<]+/g.test(e) && !emojiRegex().test(e))
      .map((e) => e.replace(/\p{Cc}/gu, '').toLowerCase());

    // Keep the semantic frequency
    for (const word of fileContentWords) {
      if (!frequencyMap.hasOwnProperty(word)) {
        frequencyMap[word] = 0;
      }
      frequencyMap[word]++;
    }

    if (symbols.hasOwnProperty(symbolName)) {
      for (const word of fileContentWords) {
        // Deduplicate
        if (symbols[symbolName].indexOf(word) < 0) {
          symbols[symbolName].push(word);
        }
      }
    }
  }

  const words = [];
  for (const word in frequencyMap) {
    words.push([word, frequencyMap[word]]);
  }
  words.sort(function (a, b) {
    return b[1] - a[1];
  });

  const dictionary = words.map((e) => e[0]);
  const result = {
    dictionary: dictionary.join(','),
    symbols: {}
  };
  for (const symbolKey in symbols) {
    // Keep proabilities calculated by the models
    const keywords = symbols[symbolKey];
    for (let i = keywords.length - 1; i >= 0; i--) {
      keywords.splice(i, 1, dictionary.indexOf(keywords[i]).toString(36));
    }
    const symbolNameComponents = symbolKey.split('_');
    for (let i = symbolNameComponents.length - 1; i >= 0; i--) {
      symbolNameComponents.splice(i, 1, dictionary.indexOf(symbolNameComponents[i]).toString(36));
    }
    result.symbols[symbolNameComponents.join('_')] = keywords.join(',');
  }

  // search-index
  const jsonString = JSON.stringify(result);

  // output search-index.json
  await writeTextFile(path.join(outputDir, 'search-index.json'), jsonString);

  // output search-index.gz
  const compressedData = pako.gzip(jsonString);
  await fs.promises.writeFile(path.join(outputDir, 'search-index.gz'), Buffer.from(compressedData));

  // index
  const jsonString2 = JSON.stringify({ list: list.join(',') });

  // output index.json
  await writeTextFile(path.join(outputDir, 'index.json'), jsonString2);

  // output index.gz
  const compressedData2 = pako.gzip(jsonString2);
  await fs.promises.writeFile(path.join(outputDir, 'index.gz'), Buffer.from(compressedData2));

  // typescript
  const typeString = `export type MaterialSymbols = ${list.map((e) => `'${e}'`).join('\n | ')}`;

  // output type.ts
  await writeTextFile(path.join(outputDir, 'type.ts'), typeString);

  // output manifest.json
  const manifest = {
    search_index: {
      raw: 'https://erichsia7.github.io/material-symbols-list/search-index.json',
      compressed: 'https://erichsia7.github.io/material-symbols-list/search-index.gz',
      md5: md5(jsonString),
      sha256: sha256(jsonString)
    },
    index: {
      raw: 'https://erichsia7.github.io/material-symbols-list/index.json',
      compressed: 'https://erichsia7.github.io/material-symbols-list/index.gz',
      md5: md5(jsonString2),
      sha256: sha256(jsonString2)
    }
  };

  await fs.promises.writeFile(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  process.exit(0);
}

main();
