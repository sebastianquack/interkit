var aws = require('aws-sdk'); 
require('dotenv').config(); // Configure dotenv to load in the .env file// Configure aws with your accessKeyId and your secretAccessKey

const endpoint = process.env.AWSEndpoint || "https://s3.amazonaws.com" // default: https://s3.amazonaws.com
const s3ForcePathStyle = endpoint.indexOf("s3.amazonaws") < 0 // use path style if it's not amazon
const S3_BUCKET = process.env.Bucket// Now lets export this function so we can call it from somewhere else

console.log(
  `
  S3 Endpoint: ${endpoint}
  S3 Bucket: ${S3_BUCKET}
`)

const s3config = {
  accessKeyId: process.env.AWSAccessKeyId,
  secretAccessKey: process.env.AWSSecretKey,
  endpoint,
  s3ForcePathStyle,
  //signatureVersion: 'v4'
}

aws.config.update(s3config)

module.exports = {
  s3config,
  S3_BUCKET
}