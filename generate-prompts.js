const fs = require('fs');
const path = require('path');
const { makeDirectory, writeTextFile, getFiles, readFile } = require('./files.js');

function getSynonymyPrompt(symbol, tags) {
  return `You are an expert in UI/UX design and iconography.
I will provide you with a list of visually matched icon tags.
For each icon, provide 5 to 10 *extra* synonymies, alternative names, or related UI concepts that a user might search for to find this icon.

Rules:
- Focus on what the icon *looks like* and its *UI function*.
- Transform them into *different part of speeches and forms*, such as verb, noun, pronoun, proper noun, gerund, adjective, adverb, preposition, conjunction, auxiliary, determiner, and inflections.
- Always check if a synonymy *fits the ICON NAME* in your thinking process. Do not fabricate things that don't exist.
- Output ONLY a list of tags concatenated by commas. No markdown formatting, no explanations.

EXAMPLE:
settings -> gear, cog, preferences, options, components
favorite -> heart, like, love, save
new -> add, create, fresh, brand-new, freshness

List synonymies for "${symbol}". (ICON NAME = "${symbol}")

Here're some relevant tags of the icon:
${tags}`;
}

function getDescriptionPrompt(symbol, tags) {
  return `You are an icon lexicographer. Given one or more icons, produce concise,
accurate, and friendly description for each.

The description consists of two sentences.
1. Sentence 1 describes what the icon literally depicts.
2. Sentence 2 (optional) explains its common meaning, tone, or typical usage.

Rules:
- Be factually correct about what the symbol means; do not invent meanings.
- Do not fabricate things that don't exist.
- Neutral, inclusive tone. Avoid slang that may not age well.
- Do not include the icon name inside the desc text.
- Keep it under ~160 characters. Warm, plain English.
- Just output the plain text, no formatting, no commentary.

Write a description for the icon "${symbol}".

Here're some relevant tags of the icon:
${tags}`;
}

async function main() {
  const versions = require('./versions.json');
  const timestamps = require('./timestamps.json');

  const synonymiesDir = './synonymies';
  const descriptionsDir = './descriptions';
  const tagsDir = './tags';
  const outputDir = './tmp/prompts';

  await makeDirectory(synonymiesDir);
  await makeDirectory(descriptionsDir);
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
    const content = await readFile(path.join(tagsDir, `${symbolKey}.txt`));
    if (type === 0) {
      // synonymy
      const promptPath = path.join(outputDir, `${symbolKey}.synonymy.txt`);
      const synonymyPath = path.join(synonymiesDir, `${symbolKey}.txt`);
      await writeTextFile(promptPath, getSynonymyPrompt(symbolKey, content));
      commands.push(`echo "\n\n\x1b[1m[${count}/${totalCount}] [S]\x1b[0m \x1b[1;4m${symbolKey}\x1b[0m"`, `jq -Rs '{model: "gemma4:e4b", prompt: ., think: true, stream: true, options: {temperature: 0.95, top_p: 0.95, top_k: 64}}' "${promptPath}" | curl -s http://localhost:11434/api/generate -d @- | jq --unbuffered -j '.response // empty' | tee "${synonymyPath}"`, `echo "\n\n"`);
    } else if (type === 1) {
      // description
      const promptPath = path.join(outputDir, `${symbolKey}.description.txt`);
      const descriptionPath = path.join(descriptionsDir, `${symbolKey}.txt`);
      await writeTextFile(promptPath, getDescriptionPrompt(symbolKey, content));
      commands.push(`echo "\n\n\x1b[1m[${count}/${totalCount}] [D]\x1b[0m \x1b[1;4m${symbolKey}\x1b[0m"`, `jq -Rs '{model: "gemma4:e4b", prompt: ., think: true, stream: true, options: {temperature: 0.85, top_p: 0.95, top_k: 64}}' "${promptPath}" | curl -s http://localhost:11434/api/generate -d @- | jq --unbuffered -j '.response // empty' | tee "${descriptionPath}"`, `echo "\n\n"`);
    }
    timestamps[symbolKey][type] = now;
  }

  await writeTextFile('./tmp/list-synonymies-and-create-descriptions.sh', commands.join('\n\n'));
  await writeTextFile('./tmp/timestamps.json', JSON.stringify(timestamps, null, 2));

  fs.appendFileSync(process.env.GITHUB_OUTPUT, `queued-symbols-count=${queue.length}\n`);
  process.exit(0);
}

main();
