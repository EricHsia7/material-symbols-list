const fs = require('fs');
const path = require('path');
const { makeDirectory, writeTextFile, getFiles, readFile } = require('./files.js');

function getPrompt(symbolName, tags) {
  return `You are an expert in UI/UX design and iconography. 
    I will provide you with a list of visually matched tags. 
    For each icon, provide 3 to 5 *extra* synonyms, alternative names, or related UI concepts that a user might search for to find this icon.
    
    IMPORTANT RULES:
    1. Focus on what the icon *looks like* and its *UI function*.
    2. Output ONLY a list of tags concatenated by commas. No markdown formatting, no explanations.
    
    EXAMPLE:
    settings -> gear, cog, preferences, options, components
    favorite -> heart, like, love, save
    
    ICON NAME:
    ${symbolName}

    ICON TAGS TO PROCESS:
    ${tags}`;
}

async function main() {
  const outputDir = './synonymies';
  const promptDir = './tmp/prompts';

  await makeDirectory(outputDir);
  await makeDirectory(promptDir);
  const tags = await getFiles('./tags/');
  const synonymies = await getFiles('./synonymies/');

  const processed = [];
  for (const synonymy of synonymies) {
    const extension = path.extname(synonymy.path.name);
    const symbolName = path.basename(synonymy.path.name, extension);
    processed.push(symbolName);
  }

  const unprocessed = [];
  let count = 0;
  for (const tag of tags) {
    const extension = path.extname(tag.path.name);
    const symbolName = path.basename(tag.path.name, extension);
    if (processed.indexOf(symbolName) < 0) {
      const content = await readFile(tag.path.full);

      unprocessed.push([symbolName, content]);
      count++;
    }
    if (count > 8) {
      break;
    }
  }

  const commands = [];
  for (const [symbolName, content] of unprocessed) {
    const prompt = getPrompt(symbolName, content);

    const promptPath = `${promptDir}/${symbolName}.txt`;
    await writeTextFile(promptPath, prompt);
    const outputPath = `${outputDir}/${symbolName}.txt`;

    const command = `ollama run gemma4:e4b < "${promptPath}" | tee "${outputPath}"`;
    commands.push(command);
  }

  await writeTextFile('./synonymy.sh', commands.join('\n\n'));
  process.exit(0);
}

main();
