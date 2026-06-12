const { spawn } = require('node:child_process');

async function matchDescription(image_path, descriptions) {
  return await new Promise(function (resolve, reject) {
    // Pass the script name and arguments as an array
    const pythonProcess = spawn('python3.11', ['./match.py', image_path].concat(descriptions));

    // Collect output from the Python script
    pythonProcess.stdout.on('data', (data) => {
      resolve(data.toString());
    });

    // Handle script errors
    pythonProcess.stderr.on('data', (data) => {
      reject(`Error: ${data.toString()}`);
    });

    // Handle process completion
    pythonProcess.on('close', (code) => {
      // console.log(`Child process exited with code ${code}`);
    });
  });
}

module.exports = {
  matchDescription
};
