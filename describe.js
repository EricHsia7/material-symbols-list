const { default: ollama } = require('ollama');
const { readFile, writeTextFile, readImageAsArray } = require('./files');
const { verifyPropositions } = require('./verify');
const fs = require('fs');

async function main() {
  const args = process.argv.slice(2);
  const [symbolName, tagsPath, imagePath, outputPath] = args;

  const tags = await readFile(tagsPath);
  const image = await readImageAsArray(imagePath);

  const maximumToolCall = 16;
  let toolCallCount = 0;

  const modelName = 'gemma4:e4b';

  const tools = [
    {
      type: 'function',
      function: {
        name: 'verify_propositions',
        description: 'Verify propositions',
        parameters: {
          type: 'object',
          properties: {
            propositions: {
              type: 'array',
              description: 'A 2D array of strings representing rows and columns. Grouped propositions per row.',
              items: {
                type: 'array',
                description: 'A single row containing string values. Put propositions here.',
                items: {
                  type: 'string'
                }
              }
            }
          },
          required: ['propositions']
        }
      }
    }
  ];

  const messages = [
    {
      role: 'system',
      content: `You are a lexicographer. Your task is to generate an accurate, factually correct, and friendly description. The description consists of two sentences.

- Sentence 1 describes what the icon literally depicts.
- Sentence 2 explains its common meaning, tone, or typical usage.

Rules:

- For each turn:
    - Draft 3 to 5 candidate descriptions. For example, "The design is an outline of a simple, modern computer monitor screen with 5 grids that represent multitasking or windowing."
    - Generate propositions for each draft, then use verify_propositions() to verify the *details*. Each proposition should correspond to a single detail or point. For example, [['It is a computer monitor screen.', 'There are 5 grids in the illustration.', 'It is an outline of a computer monitor.', 'It illustrates multiple apps or programs running on a computer.', ...], ...].
    - Read the suggestions and revise your description.
- Iterate multiple times in your thinking process so the description is eventually relevant and accurate.
- Return exactly one description in the final output. Output plain text only, with no formatting or commentary.
- Do not include the name in the description so the content is clean and concise.
- Keep the final description under 3 sentences. Use warm, plain English.`
    },
    {
      role: 'user',
      content: `Generate a description for "${symbolName}". Here're some tags of the icon: \n ${tags}`,
      images: [image]
    }
  ];

  // Initial call to the model
  let response = await ollama.chat({
    model: modelName,
    messages,
    tools,
    think: true,
    options: {
      temperature: 0.95
    }
  });
  messages.push(response.message);

  while (response.message.tool_calls && response.message.tool_calls.length > 0 && toolCallCount < maximumToolCall) {
    for (const tool of response.message.tool_calls) {
      console.log(`Calling ${tool.function.name} with`, JSON.stringify(tool.function.arguments, null, 2));

      let functionResult = '';

      // Execute the requested function
      if (tool.function.name === 'verify_propositions') {
        const { propositions } = tool.function.arguments;
        functionResult = await verifyPropositions(imagePath, propositions);
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

    console.log('Sending tool results back to the model...');
    response = await ollama.chat({
      model: modelName,
      messages,
      tools,
      think: true,
      options: {
        temperature: 0.65
      }
    });

    messages.push(response.message);
  }

  console.log(response.message.content);
  await writeTextFile(outputPath, response.message.content);

  process.exit(0);
}

main();
