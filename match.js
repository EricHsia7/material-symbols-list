const { spawn } = require('node:child_process');

function validateDescriptionsStructure(descriptions) {
  if (typeof descriptions !== 'object' || !Array.isArray(descriptions)) {
    throw new Error('Please fix your input. The input should be a list.');
    return false;
  }

  if (descriptions.some((description) => typeof description !== 'object' || !Array.isArray(description))) {
    throw new Error('Please fix your input. The input should be a list of arrays.');
    return false;
  }

  if (descriptions.some((description) => description.some((part) => typeof part !== 'string'))) {
    throw new Error('Please fix your input. The input should be a list of arrays of string.');
    return false;
  }

  return true;
}

async function matchDescription(image_path, descriptions) {
  try {
    validateDescriptionsStructure(descriptions);

    return await new Promise(function (resolve, reject) {
      const pythonExecutable = 'python_venv_synonymy_description/bin/python';

      // Pass the script name and arguments as an array
      const pythonProcess = spawn(pythonExecutable, ['./match.py', image_path]);

      // Collect output from the Python script
      pythonProcess.stdout.on('data', (data) => {
        resolve(data.toString());
      });

      // Handle script errors
      pythonProcess.stderr.on('data', (data) => {
        reject(data.toString());
      });

      // Handle process completion
      pythonProcess.on('close', (code) => {
        // console.log(`Child process exited with code ${code}`);
      });

      // Pass descriptions
      pythonProcess.stdin.write(JSON.stringify({ descriptions }));
      pythonProcess.stdin.end();
    });
  } catch (err) {
    return `Error: ${err.message}`;
  }
}

module.exports = {
  matchDescription
};
