const crypto = require('crypto');

function sha256(data) {
  const hash = crypto.createHash('sha256');
  hash.update(data);
  return hash.digest('hex');
}

function md5(data) {
  const hash = crypto.createHash('md5');
  hash.update(data);
  return hash.digest('hex');
}

module.exports = {
  sha256,
  md5
};
