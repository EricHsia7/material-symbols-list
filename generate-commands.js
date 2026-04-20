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
    const chunkId = path.basename(prompt.path.name, extension);
    const outputPath = path.join(outputDir, `${chunkId}.txt`);
    commands.push(`ollama run gemma4:e2b --think --hidethinking < "${prompt.path.full}" | tee "${outputPath}"`, `echo "Listed synonymies for chunk ${chunkId}".`);
  }

  await writeTextFile('./tmp/list-synonymies.sh', commands.join('\n\n'));
  process.exit(0);
}

main();
