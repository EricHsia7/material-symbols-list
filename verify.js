const { spawn } = require('node:child_process');

function validateStructure(propositions) {
  if (typeof propositions !== 'object' || !Array.isArray(propositions)) {
    throw new Error('Please fix your input. The input should be a list.');
  }

  if (propositions.some((proposition) => typeof proposition !== 'string')) {
    throw new Error('Please fix your input. The input should be a list of string.');
  }

  return true;
}

async function verifyPropositions(image_path, propositions) {
  try {
    validateStructure(propositions);

    return await new Promise(function (resolve, reject) {
      const pythonExecutable = 'python_venv_synonymy_description/bin/python';

      // Pass the script name and arguments as an array
      const pythonProcess = spawn(pythonExecutable, ['./verify.py', image_path]);

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

      // Pass propositions
      pythonProcess.stdin.write(JSON.stringify({ propositions }));
      pythonProcess.stdin.end();
    });
  } catch (err) {
    return `Error: ${err}`;
  }
}

module.exports = {
  verifyPropositions
};
