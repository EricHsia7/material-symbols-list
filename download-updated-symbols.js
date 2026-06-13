const fs = require('fs');
const path = require('path');
const { makeDirectory, writeTextFile } = require('./files.js');

async function main() {
  const queuedDir = './tmp/queued/';
  const versions = require('./versions.json');
  const latestVersions = require('./tmp/versions.json');
  const updated = [];

  for (const symbolName in latestVersions) {
    if (versions.hasOwnProperty(symbolName)) {
      if (latestVersions.hasOwnProperty(symbolName) && latestVersions[symbolName] !== versions[symbolName]) {
        updated.push(symbolName);
      }
    } else {
      updated.push(symbolName);
    }
  }

  await makeDirectory(queuedDir);

  for (const symbolName of updated) {
    const url = `https://raw.githubusercontent.com/marella/material-symbols/refs/heads/main/svg/400/rounded/${symbolName}.svg`;
    try {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch SVG: ${response.statusText} (${response.status})`);
      }

      // Get the SVG content as text
      const svgContent = await response.text();

      // Define the full path for the output file
      const outputPath = path.join(queuedDir, `${symbolName}.svg`);

      // Save the SVG content to the file, overwriting if it exists
      await writeTextFile(outputPath, svgContent);

      console.log(`SVG successfully downloaded to: ${outputPath}`);
    } catch (error) {
      console.error(`Error fetching or saving SVG:`, error);
    }
  }

  fs.appendFileSync(process.env.GITHUB_OUTPUT, `updated-symbols-count=${updated.length}\n`);
  process.exit(0);
}

main();
