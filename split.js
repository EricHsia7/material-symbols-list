function splitByTopLevelDelimiter(value, legalDelimiters = [' ', ',', '.']) {
  value = value.trim();
  let leftBracket = 0;
  let rightBracket = 0;
  let start = 0;
  const result = [];
  const delimiters = [];
  const len = value.length;
  for (let i = 0, l = len, l1 = len - 1; i < l; i++) {
    const char = value[i];
    if (char === '(') {
      leftBracket++;
    }
    if (char === ')') {
      rightBracket++;
    }
    if (leftBracket === rightBracket) {
      if (legalDelimiters.indexOf(char) > -1) {
        result.push(value.slice(start, i).trim());
        delimiters.push(char);
        start = i + 1;
      } else if (i === l1) {
        result.push(value.slice(start, i + 1).trim());
        start = i + 1;
      }
    }
  }
  return { result, delimiters };
}

function joinByDelimiters(array, delimiters) {
  const arrayLen = array.length;
  const delimitersLen = delimiters.length;
  if (arrayLen - 1 === delimitersLen) {
    for (let i = 1, offset = 0, l = arrayLen; i < l; i++, offset++) {
      array.splice(i + offset, 0, delimiters[i - 1]);
    }
    return array.join('');
  } else {
    return array.join(' ');
  }
}

// Compress array into a string like " 5.1 12.1"
function compressDelimiters(delimiters) {
  if (!delimiters || delimiters.length === 0) return '';

  let compressed = '';
  let current = delimiters[0];
  let count = 1;

  for (let i = 1; i < delimiters.length; i++) {
    if (delimiters[i] === current) {
      count++;
    } else {
      compressed += current + count;
      current = delimiters[i];
      count = 1;
    }
  }
  return compressed + current + count;
}

// Decompress string back into an array
function decompressDelimiters(compressedStr) {
  const result = [];
  // Match any non-digit, followed by 1 or more digits
  compressedStr.replace(/([^0-9])([0-9]+)/g, (_, char, countStr) => {
    const count = parseInt(countStr, 10);
    // Push the character 'count' times into the array
    result.push(...Array(count).fill(char));
  });
  return result;
}

module.exports = {
  splitByTopLevelDelimiter,
  joinByDelimiters,
  compressDelimiters,
  decompressDelimiters
};
