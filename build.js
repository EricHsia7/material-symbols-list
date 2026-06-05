const fs = require('fs');
const path = require('path');
const { makeDirectory, writeTextFile, getFiles, readFile } = require('./files.js');
const pako = require('pako');
const emojiRegex = require('emoji-regex');
const { splitByTopLevelDelimiter, compressDelimiters } = require('./split.js');

const stats = {
  symbols_count: 0,
  keywords_count: 0,
  synonymies_coverage: 0,
  descriptions_coverage: 0
};

async function buildIndex(tagFiles, versions, outputDir) {
  const list = [];
  for (const file of tagFiles) {
    const extension = path.extname(file.path.name);
    const symbolName = path.basename(file.path.name, extension);
    if (!versions.hasOwnProperty(symbolName)) continue;
    list.push(symbolName);
  }
  // index
  const jsonString = JSON.stringify({ list: list.join(',') });

  // output index.json
  await writeTextFile(path.join(outputDir, 'index.json'), jsonString);

  // output index.gz
  const compressedData = pako.gzip(jsonString);
  await fs.promises.writeFile(path.join(outputDir, 'index.gz'), Buffer.from(compressedData));

  // report stats
  stats.symbols_count = list.length;
}

async function buildSearchIndex(tagFiles, synonymyFiles, versions, timestamps, outputDir) {
  const frequencyMap = {};
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
    symbols[symbolName] = allWordsUnique;
  }

  let synonymiesCount = 0;
  for (const file of synonymyFiles) {
    const extension = path.extname(file.path.name);
    const symbolName = path.basename(file.path.name, extension);
    if (!versions.hasOwnProperty(symbolName)) continue;
    const content = await readFile(file.path.full);
    const fileContentWords = content
      .split(/[;,\n\s\_\/]+/g)
      .filter((e) => e !== '' && !/\[[a-z0-9]+|(->)|[\u4E00-\u9FFF]+|[\~\*\{\}\!\#\@\$\`\>\<\(\)\[\]]{1,}/gi.test(e) && !emojiRegex().test(e) && /^[a-z0-9\-]+$/gi.test(e))
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

    if (timestamps.hasOwnProperty(symbolName)) {
      if (timestamps[symbolName][0] > 0) {
        synonymiesCount++;
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

  // report stats
  stats.keywords_count = dictionary.length;
  stats.synonymies_coverage = Math.round((synonymiesCount / stats.symbols_count) * 100) / 100;
}

async function buildDescription(descriptionFiles, versions, timestamps, outputDir) {
  const frequencyMap = {};
  const descriptions = {};
  for (const file of descriptionFiles) {
    const extension = path.extname(file.path.name);
    const symbolName = path.basename(file.path.name, extension);

    if (!versions.hasOwnProperty(symbolName)) continue;

    const content = await readFile(file.path.full);
    const splitWords = splitByTopLevelDelimiter(content.trim());
    const compressedDelimiters = compressDelimiters(splitWords.delimiters);
    descriptions[symbolName] = { words: splitWords.result, delimiters: compressedDelimiters };
    for (const word of splitWords.result) {
      if (!frequencyMap.hasOwnProperty(word)) {
        frequencyMap[word] = 0;
      }
      frequencyMap[word]++;
    }

    const allWords = [];
    for (const word in frequencyMap) {
      allWords.push([word, frequencyMap[word]]);
    }

    allWords.sort(function (a, b) {
      return b[1] - a[1];
    });

    const dictionary = allWords.map((e) => e[0]);

    const result = { dictionary: dictionary, descriptions: {} };
    for (const symbolName in descriptions) {
      for (let i = descriptions[symbolName].words.length - 1; i >= 0; i++) {
        descriptions[symbolName].words.splice(i, 1, dictionary.indexOf(descriptions[symbolName].words[i]).toString(36));
      }
      result.descriptions[symbolName] = [descriptions[symbolName].words.join(','), descriptions[symbolName].delimiters];
    }

    if (timestamps.hasOwnProperty(symbolName)) {
      if (timestamps[symbolName][1] > 0) {
        descriptionsCount++;
      }
    }
  }

  // description
  const jsonString = JSON.stringify(result);

  // output description.json
  await writeTextFile(path.join(outputDir, 'description.json'), jsonString);

  // output description.gz
  const compressedData = pako.gzip(jsonString);
  await fs.promises.writeFile(path.join(outputDir, 'description.gz'), Buffer.from(compressedData));

  // report stats
  stats.descriptions_coverage = Math.round((descriptionsCount / stats.symbols_count) * 100) / 100;
}

async function buildStats(versions, timestamps, outputDir) {
  // output stats.json
  await writeTextFile(path.join(outputDir, 'stats.json'), JSON.stringify(stats, null, 2));
}

async function buildTypescriptFile(versions, outputDir) {
  const list = [];
  for (const file of tagFiles) {
    const extension = path.extname(file.path.name);
    const symbolName = path.basename(file.path.name, extension);
    if (!versions.hasOwnProperty(symbolName)) continue;
    list.push(symbolName);
  }

  // typescript
  const typeString = `export type MaterialSymbols = ${list.map((e) => `'${e}'`).join('\n | ')}`;

  // output type.ts
  await writeTextFile(path.join(outputDir, 'type.ts'), typeString);
}

async function main() {
  const versions = require('./versions.json');
  const timestamps = require('./timestamps.json');
  const outputDir = './dist';
  await makeDirectory(outputDir);
  const tagFiles = await getFiles('./tags/');
  const synonymyFiles = await getFiles('./synonymies/');
  const descriptionFiles = await getFiles('./descriptions/');
  await buildIndex(tagFiles, versions, outputDir);
  await buildSearchIndex(tagFiles, synonymyFiles, versions, timestamps, outputDir);
  await buildDescription(descriptionFiles, versions, timestamps, outputDir);
  await buildTypescriptFile(versions, outputDir);
  await buildStats(versions, timestamps, outputDir);

  process.exit(0);
}

main();
