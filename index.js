const fs = require('fs');
const pako = require('pako');

async function fetchLatestVersionJson() {
  const url = `https://raw.githubusercontent.com/marella/material-symbols/main/_data/versions.json?_${new Date().getTime()}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Failed to fetch the latest version JSON:', error);
    return null;
  }
}

function compressStringToGzip(inputString, outputFilePath) {}

const inputString = 'This is the string to compress into gzip.';
const outputFilePath = 'archive.gz';

compressStringToGzip(inputString, outputFilePath);

async function main() {
  var json = await fetchLatestVersionJson();
  var list = [];
  for (var key in json) {
    list.push(key);
  }
  const text = list.join(',');
  const outputFilePath = './dist/index.gz';
  // Compress the input string using pako
  const compressedData = pako.gzip(inputString);
  // Save the compressed data to a .gz file
  await fs.promises.writeFile(outputFilePath, Buffer.from(compressedData));
  process.exit(0);
}

main();
