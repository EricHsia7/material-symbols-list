const fs = require('fs');
const path = require('path');
const { makeDirectory, writeTextFile, readFile } = require('./files.js');

function getSynonymyPrompt(symbol, tags) {
  return `You are an expert in UI/UX design and iconography.
I will provide you with a list of visually matched icon tags.
For each icon, provide 5 to 15 *extra* synonymies, alternative names, or related UI concepts that a user might search for to find this icon.

Rules:
- Focus on what the icon *looks like* and its *UI function*.
- Transform them into *different part of speeches and forms*, such as verb, noun, pronoun, proper noun, gerund, adjective, adverb, preposition, conjunction, auxiliary, determiner, and inflections.
- Enqueue various visual descriptors.
- Always check if a synonymy *fits the ICON_NAME* in your thinking process.
- Output ONLY a list of tags concatenated by commas. No markdown formatting, no explanations.

Examples:
| Input    | Output                                                |
|----------|-------------------------------------------------------|
| settings | gear, cog, preferences, options, components           |
| favorite | heart, like, love, saved item, bookmark, shape        |
| new      | add, create, fresh, brand-new, freshness, plus, cross |

List synonymies for "${symbol}". (ICON_NAME="${symbol}")

Here're some relevant tags of the icon:
${tags}`;
}

async function main() {
  const versions = require('./versions.json');
  const timestamps = require('./timestamps.json');

  const synonymiesDir = './synonymies';
  const descriptionsDir = './descriptions';
  const tagsDir = './tags';
  const queuedDir = './tmp/queued';
  const outputDir = './tmp/prompts';
  const rasterizedDir = './tmp/rasterized';

  await makeDirectory(synonymiesDir);
  await makeDirectory(descriptionsDir);
  await makeDirectory(queuedDir);
  await makeDirectory(outputDir);

  const now = new Date().getTime();
  const exp = 60 * 60 * 24 * 60 * 1000;
  const time = now - exp;
  for (const symbolKey in versions) {
    if (!timestamps.hasOwnProperty(symbolKey)) {
      timestamps[symbolKey] = [-1, 0];
      // [synonymy, description]
      // prioritize synonymy
    }
  }

  const candidates = [];
  for (const symbolKey in timestamps) {
    if (!versions.hasOwnProperty(symbolKey)) {
      continue;
    }
    if (timestamps[symbolKey][0] <= 0 || timestamps[symbolKey][0] <= time) {
      candidates.push([symbolKey, timestamps[symbolKey][0], 0]);
    }
    if (timestamps[symbolKey][1] <= 0 || timestamps[symbolKey][1] <= time) {
      candidates.push([symbolKey, timestamps[symbolKey][1], 1]);
    }
  }

  candidates.sort(function (a, b) {
    return a[1] - b[1];
  });

  const queue = candidates.slice(0, 64);
  const commands = [];

  const totalCount = queue.length;
  let count = 0;
  for (const [symbolKey, timestamp, type] of queue) {
    count++;
    const tagsPath = path.join(tagsDir, `${symbolKey}.txt`);
    const content = await readFile(tagsPath);
    if (type === 0) {
      // synonymy
      const promptPath = path.join(outputDir, `${symbolKey}.synonymy.txt`);
      const synonymyPath = path.join(synonymiesDir, `${symbolKey}.txt`);
      await writeTextFile(promptPath, getSynonymyPrompt(symbolKey, content));
      commands.push(`echo "\n\n\x1b[1m[${count}/${totalCount}] [S]\x1b[0m \x1b[1;4m${symbolKey}\x1b[0m"`, `jq -Rs '{model: "gemma4:e4b", prompt: ., think: true, stream: true, options: {temperature: 0.95, top_p: 0.95, top_k: 64}}' "${promptPath}" | curl -s http://localhost:11434/api/generate -d @- | jq --unbuffered -j '.response // empty' | tee "${synonymyPath}"`, `echo "\n\n"`);
    } else if (type === 1) {
      const url = `https://raw.githubusercontent.com/marella/material-symbols/refs/heads/main/svg/400/rounded/${symbolKey}.svg`;
      try {
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Failed to fetch SVG: ${response.statusText} (${response.status})`);
        }
        const svgContent = await response.text();
        const svgPath = path.join(queuedDir, `${symbolKey}.svg`);
        await writeTextFile(svgPath, svgContent);
        console.log(`SVG successfully downloaded to: ${svgPath}`);
      } catch (error) {
        console.error(`Error fetching or saving SVG:`, error);
      }

      // description
      const descriptionPath = path.join(descriptionsDir, `${symbolKey}.txt`);
      const imagePath = path.join(rasterizedDir, `${symbolKey}.png`);
      commands.push(`echo "\n\n\x1b[1m[${count}/${totalCount}] [D]\x1b[0m \x1b[1;4m${symbolKey}\x1b[0m"`, `node describe.js ${symbolKey} ${tagsPath} ${imagePath} ${descriptionPath}`, `echo "\n\n"`);
    }
    timestamps[symbolKey][type] = now;
  }

  await writeTextFile('./tmp/list-synonymies-and-create-descriptions.sh', commands.join('\n\n'));
  await writeTextFile('./tmp/timestamps.json', JSON.stringify(timestamps, null, 2));

  fs.appendFileSync(process.env.GITHUB_OUTPUT, `queued-symbols-count=${queue.length}\n`);
  process.exit(0);
}

main();
