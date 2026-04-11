const fs = require('fs');
const path = require('path');
const { makeDirectory, writeTextFile, getFiles, readFile } = require('./files.js');
const pako = require('pako');

async function main() {
  const versions = require('./versions.json');
  const outputDir = './dist';
  await makeDirectory(outputDir);
  const files = await getFiles('./tags/');
  const frequencyMap = {};
  const symbols = [];
  for (const file of files) {
    const extension = path.extname(file.path.name);
    const symbolName = path.basename(file.path.name, extension);
    if (!versions.hasOwnProperty(symbolName)) continue;
    const content = await readFile(file.path.full);
    const fileNameWords = symbolName.split('_');
    const fileContentWords = content.split(/[\n\s]+/g).filter((e) => e !== '');
    const allWords = fileNameWords.concat(fileContentWords);
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
    symbols.push([symbolName, allWordsUnique]);
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
  for (const symbol of symbols) {
    // keep proabilities calculated by the model
    const keywords = symbol[1];
    for (let i = keywords.length - 1; i >= 0; i--) {
      keywords.splice(i, 1, dictionary.indexOf(keywords[i]).toString(36));
    }
    const symbolNameComponents = symbol[0].split('_');
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

  // output index.json
  const jsonString2 = JSON.stringify({ list: symbols.map((e) => e[0]).join(',') });
  await writeTextFile(path.join(outputDir, 'index.json'), jsonString2);

  // output index.gz
  const compressedData2 = pako.gzip(jsonString2);
  await fs.promises.writeFile(path.join(outputDir, 'index.gz'), Buffer.from(compressedData2));

  // typescript

  // output type.ts
  const typeString = `export type MaterialSymbols = ${symbols
    .map((e) => e[0])
    .map((e) => `'${e}'`)
    .join('\n | ')}`;
  await writeTextFile(path.join(outputDir, 'type.ts'), typeString);

  process.exit(0);
}

main();
