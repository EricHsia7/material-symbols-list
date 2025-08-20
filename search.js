const levenshtein = require('js-levenshtein');

class MaterialSymbolsList {
  constructor() {
    this.searchIndex = {};
    this.searchStructures = {};
    this.ready = false;
    this.url = 'https://erichsia7.github.io/material-symbols-list/search-index.json';
  }

  __buildSearchStructures(searchIndex) {
    const dictionary = searchIndex.dictionary.split(',');
    const symbols = searchIndex.symbols;
    const names = [];
    const wordToSymbols = {}; // { w0: [0, 2], ... }

    let nameIndex = 0;
    for (const symbol in symbols) {
      // Create list of symbol names
      names.push(symbol);
      // Build wordIndex → nameIndex mapping
      for (const wordIndex of symbols[symbol]) {
        const key = `w${wordIndex}`;
        if (!wordToSymbols.hasOwnProperty(key)) {
          wordToSymbols[key] = [];
        }
        wordToSymbols[key].push(nameIndex);
      }
      nameIndex++;
    }

    return { dictionary, names, wordToSymbols };
  }

  __getIntersection(a, b) {
    let result = [];
    if (a.length <= b.length) {
      for (const item of a) {
        if (b.indexOf(item) > -1) {
          result.push(item);
        }
      }
    } else {
      for (const item of b) {
        if (a.indexOf(item) > -1) {
          result.push(item);
        }
      }
    }
    return result;
  }

  async initialize() {
    const response = await fetch(this.url);
    if (!response.ok) throw new Error('Failed to fetch search index.');
    this.searchIndex = await response.json();
    this.searchStructures = this.__buildSearchStructures(this.searchIndex);
    this.ready = true;
  }

  searchFor(query, searchFrom = 0, skipBroadTerms = true, broadThreshold = 0.3) {
    const { dictionary, names, wordToSymbols } = this.searchStructures;
    const broadLength = Math.round(names.length * broadThreshold);

    // Split query
    const queryWords = Array.from(new Set(query.trim().toLowerCase().split(/\s+/)));
    const queryWordsLength = queryWords.length;

    // Fuzzy match words to dictionary indices
    const minDistances = new Uint8Array(queryWordsLength);
    const matchedWordIndexes = new Int16Array(queryWordsLength).fill(-1);

    for (let j = searchFrom; j < queryWordsLength; j++) {
      minDistances[j] = queryWords[j].length;
      for (let i = 0, l = dictionary.length; i < l; i++) {
        const distance = levenshtein(queryWords[j], dictionary[i]);
        if (distance <= minDistances[j]) {
          minDistances[j] = distance;
          matchedWordIndexes[j] = i;
        }
      }
    }

    // Pair words with symbols
    let indexArrays = [];
    for (let i = queryWordsLength - 1; i >= 0; i--) {
      if (matchedWordIndexes[i] < 0) continue;
      const arr = wordToSymbols[`w${matchedWordIndexes[i]}`] || [];
      if (skipBroadTerms && arr.length > broadLength) continue;
      indexArrays.push(arr);
    }

    const indexArraysLength = indexArrays.length;

    if (indexArraysLength === 0) return [];

    // Sort by length (shortest → longest)
    indexArrays.sort((a, b) => a.length - b.length);

    // Intersect
    let candidates = indexArrays[0];
    for (let i = 1; i < indexArraysLength; i++) {
      candidates = this.__getIntersection(candidates, indexArrays[i]);
    }

    // Rank candidates
    const scored = [];
    for (let i = 0, l = candidates.length; i < l; i++) {
      let score = 0;
      for (let j = queryWordsLength - 1; j >= 0; j--) {
        if (matchedWordIndexes[j] < 0) continue;
        const symbolWordIndexes = wordToSymbols[`w${matchedWordIndexes[j]}`] || [];
        if (symbolWordIndexes.indexOf(candidates[i]) > -1) {
          score -= j; // earlier query words = higher weight
        }
      }
      scored.push([names[candidates[i]], score]);
    }

    scored.sort((a, b) => b[1] - a[1]);
    return scored;
  }
}

export default MaterialSymbolsList;
