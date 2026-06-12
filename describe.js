const { default: ollama } = require('ollama');
const { readFile, writeTextFile } = require('./files');
const { matchDescription } = require('./match');

async function main() {
  const tagsDir = './tags';
  const rasterized = './tmp/rasterized';

  const args = process.argv.slice(2);
  const [symbolName, tagsPath, imagePath, outputPath] = args;

  const tags = await readFile(path.join(tagsDir, `${symbolName}.txt`));
  const imagePath = path.join(rasterized, `${symbolName}.txt`);

  await lib.initialize();

  const maximumToolCall = 16;
  let toolCallCount = 0;

  const modelName = 'gemma4:e4b';

  const tools = [
    {
      type: 'function',
      function: {
        name: 'match_descriptions',
        description: 'Match descriptions against the image.',
        parameters: {
          type: 'object',
          properties: {
            descriptions: {
              type: 'array',
              items: {
                type: 'string'
              },
              description: 'A list of descriptions.'
            },
            subject: {
              type: 'string'
            }
          },
          required: ['descriptions']
        }
      }
    }
  ];

  const messages = [
    {
      role: 'user',
      content: `You are an icon lexicographer. Given one or more icons, produce concise,
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

Steps:
- Draft 5-10 descriptions based on the context.
- Use match_descriptions to get critics and revise the description.
- Return only the final output in plaintext.

Write a description for the icon "${symbolName}".

Here're some relevant tags of the icon:
${tags}`
    }
  ];

  // Initial call to the model
  let response = await ollama.chat({ model: modelName, messages, tools });
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

      console.log(`Result: ${functionResult}`);

      // Append the tool result to history
      messages.push({
        role: 'tool',
        content: functionResult
      });
    }

    console.log('\nSending tool results back to the model...');
    response = await ollama.chat({ model: modelName, messages, tools });

    messages.push(response.message);
  }

  console.log('\n--- Final ---');
  console.log(response.message.content);
  await writeTextFile(outputPath, response.message.content);
}

main().catch(console.error);
