// isomorphic helpers for both server and client

const cryptoRandomString = require('crypto-random-string');

const generateFilename = () =>{
  return cryptoRandomString({length: 40});
}

const generateFileKey = () =>{
  return cryptoRandomString({length: 24});
}

module.exports = {
  generateFilename,
  generateFileKey
}
