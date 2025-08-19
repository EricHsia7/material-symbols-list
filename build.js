const fs = require('fs');
const path = require('path');
const { makeDirectory, writeTextFile, getFiles, readFile } = require('./files.js');
const pako = require('pako');

async function main() {
  const outputDir = './dist';
  await makeDirectory(outputDir);
  const files = await getFiles('./tags/');
  const frequencyMap = {};
  const symbols = [];
  for (const file of files) {
    const content = await readFile(file.path.full);
    const extension = path.extname(file.path.name);
    const symbolName = path.basename(file.path.name, extension);
    const fileNameWords = symbolName.split('_');
    const fileContentWords = content.split(/\n/g).filter((e) => e !== '');
    const allWords = fileNameWords.concat(fileContentWords);
    for (const word of allWords) {
      if (!frequencyMap.hasOwnProperty(word)) {
        frequencyMap[word] = 0;
      }
      frequencyMap[word]++;
    }
    symbols.push([symbolName, allWords]);
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
    const keywords = Array.from(new Set(symbol[1]));
    for (let i = keywords.length - 1; i >= 0; i--) {
      keywords.splice(i, 1, dictionary.indexOf(keywords[i]));
    }
    keywords.sort(function (a, b) {
      return b - a; // prioritize low-frequency words quicken narrowwing down
    });
    result.symbols[symbol[0]] = keywords;
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
