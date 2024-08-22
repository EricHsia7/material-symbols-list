const fs = require('fs');
const pako = require('pako');

async function makeDirectory(path) {
  // Check if the path already exists
  try {
    await fs.promises.access(path);
    // If there is no error, it means the path already exists
    console.log('Given directory already exists!');
  } catch (error) {
    // If there is an error, it means the path does not exist
    // Try to create the directory
    try {
      await fs.promises.mkdir(path, { recursive: true });
      // If there is no error, log a success message
      console.log('New directory created successfully!');
    } catch (error) {
      // If there is an error, log it
      console.error(error);
      process.exit(1);
    }
  }
}

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

async function main() {
  var json = await fetchLatestVersionJson();
  var list = [];
  for (var key in json) {
    list.push(key);
  }
  const text = list.join(',');
  // Compress the input string using pako
  const compressedData = pako.gzip(inputString);
  // Save the compressed data to a .gz file
  await makeDirectory('./dist');
  await fs.promises.writeFile('./dist/index.gz', Buffer.from(compressedData));
  process.exit(0);
}

main();
