const { default: ollama } = require('ollama');
const { readFile, writeTextFile } = require('./files');
const { matchDescription } = require('./match');
const fs = require('fs');

async function main() {
  const tagsDir = './tags';
  const rasterized = './tmp/rasterized';

  const args = process.argv.slice(2);
  const [symbolName, tagsPath, imagePath, outputPath] = args;

  const tags = await readFile(tagsPath);
  const imageBuffer = await fs.promises.readFile(imagePath);
  const image = new Uint8Array(imageBuffer);

  const maximumToolCall = 16;
  let toolCallCount = 0;

  const modelName = 'gemma4:e4b';

  const tools = [
    {
      type: 'function',
      function: {
        name: 'match_descriptions',
        description: 'Evaluate descriptions',
        parameters: {
          type: 'object',
          properties: {
            descriptions: {
              type: 'array',
              items: {
                type: 'array',
                items: {
                  type: 'string'
                }
              },
              description: 'A "list of description arrays" means you have a big list, where each item is its own smaller list of words or phrases (so it is a list of lists of string). By breaking down a description into parts, this tool is allowed to diagnose inaccurate word choice.'
            }
          },
          required: ['descriptions']
        }
      }
    }
  ];

  const messages = [
    {
      role: 'system',
      content: `You are an icon lexicographer. Given one or more icons, produce concise,
accurate, and friendly description for each.

The description consists of two sentences.
1. Sentence 1 describes what the icon literally depicts.
2. Sentence 2 (optional) explains its common meaning, tone, or typical usage.

Rules:
- For each turn:
  - Generate 10 candidate descriptions.
  - Break down each description into parts before using match_descriptions(). Split them by facts. For example, [['The design is an outline of a simple, modern computer monitor screen.', 'There are 5 grids that represent multi-tasking or windowing.']].
  - Use match_descriptions to get critics and revise the description.
- Iterate 3 to 10 times in your thinking process so the description is relevant and accurate.
- Return exactly one description in the final output. Just output the plain text, no formatting, no commentary.
- Do not include the icon name inside the desc text.
- Keep it under ~160 characters. Warm, plain English.`
    },
    {
      role: 'user',
      content: `Generate a description for "${symbolName}". Here're some tags of the icon: \n ${tags}`,
      images: [image]
    }
  ];

  // Initial call to the model
  let response = await ollama.chat({ model: modelName, messages, tools, think: true });
  messages.push(response.message);

  while (response.message.tool_calls && response.message.tool_calls.length > 0 && toolCallCount < maximumToolCall) {
    console.log(`\nModel wants to call ${response.message.tool_calls.length} tool(s)...`);

    for (const tool of response.message.tool_calls) {
      console.log(`Executing: ${tool.function.name} with`, tool.function.arguments);

      let functionResult = '';

      // Execute the requested function
      if (tool.function.name === 'match_descriptions') {
        const { descriptions } = tool.function.arguments;
        functionResult = await matchDescription(imagePath, descriptions);
        toolCallCount++;
      } else {
        functionResult = 'Error: Unknown function';
      }

      console.log(functionResult);

      // Append the tool result to history
      messages.push({
        role: 'tool',
        content: functionResult
      });
    }

    console.log('\nSending tool results back to the model...');
    response = await ollama.chat({ model: modelName, messages, tools, think: true });

    messages.push(response.message);
  }

  console.log('\n--- Final ---');
  console.log(response.message.content);
  await writeTextFile(outputPath, response.message.content);

  process.exit(0);
}

main();
