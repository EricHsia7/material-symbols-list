const crypto = require('crypto');

function sha256(data) {
  const hash = crypto.createHash('sha256');
  hash.update(data);
  return hash.digest('hex');
}

module.exports = {
  sha256
};
