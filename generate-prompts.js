const fs = require('fs');
const path = require('path');
const { makeDirectory, writeTextFile, getFiles, readFile } = require('./files.js');

function getPrompt(symbol, tags) {
  return `You are an expert in UI/UX design and iconography.
I will provide you with a list of visually matched icon tags.
For each icon, provide 5 to 10 *extra* synonymies, alternative names, or related UI concepts that a user might search for to find this icon.

IMPORTANT RULES:
1. Focus on what the icon *looks like* and its *UI function*.
2. Transform them into *different part of speeches and forms*, such as verb, noun, pronoun, proper noun, gerund, adjective, adverb, preposition, conjunction, auxiliary, determiner, and inflections.
3. Always check if a synonymy *fits the ICON NAME* in your thinking process.
4. Output ONLY a list of tags concatenated by commas. No markdown formatting, no explanations.

EXAMPLE:
settings -> gear, cog, preferences, options, components
favorite -> heart, like, love, save
new -> add, create, fresh, brand-new, freshness


ICON NAME:
${symbol}

ICON TAGS:
${tags}`;
}

async function main() {
  const versions = require('./versions.json');
  const timestamps = require('./timestamps.json');

  const synonymiesDir = './synonymies';
  const tagsDir = './tags';
  const outputDir = './tmp/prompts';

  await makeDirectory(synonymiesDir);
  await makeDirectory(outputDir);

  const now = new Date().getTime();
  for (const symbolKey in versions) {
    if (!timestamps.hasOwnProperty(symbolKey)) {
      timestamps[symbolKey] = 0;
    }
  }

  const candidates = [];
  for (const symbolKey in timestamps) {
    if (!versions.hasOwnProperty(symbolKey)) {
      continue;
    }
    if (timestamps[symbolKey] < now) {
      candidates.push([symbolKey, timestamps[symbolKey]]);
    }
  }

  candidates.sort(function (a, b) {
    return a[1] - b[1];
  });

  const queue = candidates.slice(0, 64);
  const prompts = [];
  const commands = [];

  const totalCount = queue.length;
  let count = 0;
  for (const [symbolKey, timestamp] of queue) {
    count++;
    const promptPath = path.join(outputDir, `${symbolKey}.txt`);
    const synonymyPath = path.join(synonymiesDir, `${symbolKey}.txt`);
    const content = await readFile(path.join(tagsDir, `${symbolKey}.txt`));
    await writeTextFile(promptPath, getPrompt(symbolKey, content));
    timestamps[symbolKey] = now;
    commands.push(`echo "\n\n\x1b[1m[${count}/${totalCount}]\x1b[0m \x1b[1;4m${symbolKey}\x1b[0m"`, `jq -Rs '{model: "gemma4:e4b", prompt: ., think: true, stream: true, options: {temperature: 1, top_p: 0.95, top_k: 64}}' "${promptPath}" | curl -s http://localhost:11434/api/generate -d @- | jq --unbuffered -j '.response // empty' | tee "${synonymyPath}"`, `echo "\n\n"`);
  }

  await writeTextFile('./tmp/list-synonymies.sh', commands.join('\n\n'));
  await writeTextFile('./tmp/timestamps.json', JSON.stringify(timestamps, null, 2));

  fs.appendFileSync(process.env.GITHUB_OUTPUT, `queued-symbols-count=${queue.length}\n`);
  process.exit(0);
}

main();
