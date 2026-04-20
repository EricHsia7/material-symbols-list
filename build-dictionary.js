const path = require('path');
const { writeTextFile } = require('./files.js');

async function main() {
  const versions = require('./tmp/versions.json');
  const outputDir = './tmp/prompts';
  const dictionaryPath = './tmp/dictionary.txt';
  await makeDirectory(outputDir);

  const list = [];
  for (const symbolKey in versions) {
    const phrase = symbolKey.replace(/_/g, ' ');
    if (list.indexOf(phrase) < 0) {
      list.push(phrase);
    }
    const symbolKeyComponents = symbolKey.split('_');
    for (const symbolKeyComponent of symbolKeyComponents) {
      if (symbolKeyComponent.length > 1 && list.indexOf(symbolKeyComponent) < 0) {
        list.push(symbolKeyComponent);
      }
    }
  }
  const number = 64;
  const quantity = Math.ceil(list.length / number);
  for (let i = 0; i < quantity; i++) {
    const chunk = list.slice(i * number, i * number + number).join('\n');
    const prompt = `You are an expert UI/UX designer and iconography specialist. 
I will provide a list of ${number} official Material Symbol icon names, one per line. 
For each icon name, generate 3 to 5 extra synonyms, alternative search terms, or related UI functions that a user might search for.

CRITICAL RULES:
1. Output EXACTLY ${number} lines. Your output must correspond to the input list in the exact same order.
2. Each line must ONLY contain the synonyms joined by commas. 
3. Do NOT include the original word, bullet points, numbers, prefixes, or any conversational text. 
4. Focus on what the icon *looks like* visually, and its *functional purpose* in a UI.

EXAMPLE INPUT:
settings
visibility_off
home

EXAMPLE OUTPUT:
gear, cog, options, preferences, configuration
hidden, invisible, crossed eye, hide password, blind
house, main page, start page, dashboard, residence

ACTUAL INPUT:
${chunk}`;
    await writeTextFile(path.join(outputDir, `${i}.txt`), prompt);
  }
  
  await writeTextFile(dictionaryPath, list.join('\n'));

  process.exit(0);
}

main();
