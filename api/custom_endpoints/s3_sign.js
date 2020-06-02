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

aws.config.update({
  accessKeyId: process.env.AWSAccessKeyId,
  secretAccessKey: process.env.AWSSecretKey,
  endpoint,
  s3ForcePathStyle,
  //signatureVersion: 'v4'
})

const s3_sign = (request, h) => {

  console.log("request.payload", request.payload);

  const s3 = new aws.S3();  // Create a new instance of S3
  const fileName = request.payload.fileName;
  const fileType = request.payload.fileType;// Set up the payload of what we are sending to the S3 api
  console.log("fileName", fileName);
  const s3Params = {
    Bucket: S3_BUCKET,
    Key: fileName,
    Expires: 500,
    ContentType: fileType,
    //ACL: 'public-read'
  };

  return new Promise((resolve) => {
  
    // Make a request to the S3 API to get a signed URL which we can use to upload our file
    s3.getSignedUrl('putObject', s3Params, (err, data) => {
      if(err){
        console.log(err);
        resolve({success: false, error: err})
      } 

      // Data payload of what we are sending back, the url of the signedRequest and a URL where we can access the content after its saved.
      const returnData = {
        signedRequest: data,
        url: s3ForcePathStyle ? `${endpoint}/${S3_BUCKET}/${fileName}` : `https://${S3_BUCKET}.s3.amazonaws.com/${fileName}`,
        path: fileName
      };
      console.log(returnData);
      // Send it all back    
      resolve({success:true, data:{returnData}});

    });

  });
}

module.exports = function (server, mongoose, logger) {
    server.route({
      method: 'POST',
      path: '/s3_sign',
      config: {
        handler: s3_sign,
        auth: false,
        tags: ['api'],
        plugins: {
          'hapi-swagger': {}
        }
      }
    })
}