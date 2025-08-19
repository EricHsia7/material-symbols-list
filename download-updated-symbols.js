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

async function main() {
  const outputDir = './tmp/updated/';
  const versions = require('./versions.json');
  const latestVersions = require('./tmp/versions.json');
  const updated = [];

  for (const symbolName in latestVersions) {
    if (versions.hasOwnProperty(symbolName)) {
      if (latestVersions[symbolName] !== versions[symbolName]) {
        updated.push(symbolName);
      }
    } else {
      updated.push(symbolName);
    }
  }

  await makeDirectory(outputDir);

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
      const outputPath = path.join(outputDir, `${symbolName}.svg`);

      // Save the SVG content to the file, overwriting if it exists
      await fs.writeFile(outputPath, svgContent, 'utf8');

      console.log(`SVG successfully downloaded to: ${outputPath}`);
    } catch (error) {
      console.error(`Error fetching or saving SVG:`, error);
    }
  }

  process.exit(0);
}

main();
