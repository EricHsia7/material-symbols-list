function splitByDelimiter(value, legalDelimiters = [' ']) {
  value = `\r${value.trim()}\r`;
  let start = 0;
  const result = [];
  const delimiters = [];
  const len = value.length;
  for (let i = 0, l = len, l1 = len - 1; i < l; i++) {
    const char = value[i];
    if (legalDelimiters.indexOf(char) > -1) {
      result.push(value.slice(start, i).trim());
      delimiters.push(char);
      start = i + 1;
    } else if (i === l1) {
      result.push(value.slice(start, i + 1).trim());
      start = i + 1;
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

module.exports = {
  splitByDelimiter,
  joinByDelimiters
};
