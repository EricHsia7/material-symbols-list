function splitByTopLevelDelimiter(value, legalDelimiters = [' ', ',', '.', `"`, `'`]) {
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

function compressDelimiters(delimiters) {
  if (!delimiters || delimiters.length === 0) return '';

  let compressed = '';
  let current = delimiters[0];
  let count = 1;

  for (let i = 1; i < delimiters.length; i++) {
    if (delimiters[i] === current) {
      count++;
    } else {
      compressed += current + count.toString(36);
      current = delimiters[i];
      count = 1;
    }
  }
  return compressed + current + count.toString(36);
}

function decompressDelimiters(compressedStr) {
  const result = [];
  // Match any non-alphanumeric char, followed by 1 or more base36 chars
  compressedStr.replace(/([^0-9a-z])/gi, (char, index, str) => {
    // Look ahead to grab the base36 number until the next non-alphanumeric char
    const nextDelimiterIdx = str.slice(index + 1).search(/[^0-9a-z]/i);
    const countStr = nextDelimiterIdx === -1 ? str.slice(index + 1) : str.slice(index + 1, index + 1 + nextDelimiterIdx);

    const count = parseInt(countStr, 36);
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
