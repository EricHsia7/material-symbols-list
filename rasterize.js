const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');
const { Jimp } = require('jimp');
const { makeDirectory, getFiles } = require('./files.js');

async function readSVGAsBuffer(filePath) {
  try {
    const absolutePath = path.resolve(filePath);

    // Read the file as UTF-8 string
    const svgText = await fs.promises.readFile(absolutePath, 'utf-8');

    // Convert modified text to Buffer
    const svgBuffer = Buffer.from(svgText, 'utf-8');

    return svgBuffer;
  } catch (err) {
    console.error('Error reading or modifying SVG:', err);
    throw err;
  }
}

async function rasterize(filePath, outputDir, size = 128, scale = 3) {
  const svg = await readSVGAsBuffer(filePath);
  const options = {
    background: '#ffffff',
    fitTo: {
      mode: 'width',
      value: size * scale
    }
  };
  const resvg = new Resvg(svg, options);
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  const resizedImage = await Jimp.fromBuffer(pngBuffer);
  resizedImage.resize({ w: size, h: size });
  const extension = path.extname(filePath);
  const newName = `${path.basename(filePath, extension)}.png`;
  await resizedImage.write(path.join(outputDir, newName));
}

async function main() {
  const outputDir = './tmp/rasterized/';
  await makeDirectory(outputDir);
  const files = await getFiles('./tmp/queued/', 'svg');
  for (const file of files) {
    await rasterize(file.path.full, outputDir);
    console.log(`Successfully rasterized ${file.path.name}.`);
  }

  process.exit(0);
}

main();
