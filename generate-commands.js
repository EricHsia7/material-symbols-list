const fs = require('fs');
const path = require('path');
const { writeTextFile, getFiles, makeDirectory } = require('./files.js');

async function main() {
  const outputDir = './synonymies';
  const promptDir = './tmp/prompts';

  await makeDirectory(outputDir);
  const prompts = await getFiles(promptDir);

  const commands = [];
  for (const prompt of prompts) {
    const extension = path.extname(prompt.path.name);
    const symbolName = path.basename(prompt.path.name, extension);
    const outputPath = path.join(outputDir, `${symbolName}.txt`);
    commands.push(`ollama run gemma4:e4b --think --hidethinking < "${prompt.path.full}" | tee "${outputPath}"`, `echo "Listed synonymies for ${symbolName}".`);
  }

  await writeTextFile('./tmp/list-synonymies.sh', commands.join('\n\n'));
  process.exit(0);
}

main();
