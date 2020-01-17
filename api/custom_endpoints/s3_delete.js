let Auth = require("../plugins/auth.plugin.js");
var aws = require('aws-sdk'); 
require('dotenv').config(); // Configure dotenv to load in the .env file// Configure aws with your accessKeyId and your secretAccessKey

aws.config.update({
  accessKeyId: process.env.AWSAccessKeyId,
  secretAccessKey: process.env.AWSSecretKey
})

const S3_BUCKET = process.env.Bucket// Now lets export this function so we can call it from somewhere else

const s3_delete = (request, h) => {

  console.log(request.payload);

  const s3 = new aws.S3();  // Create a new instance of S3
  const fileName = request.payload.fileName;
  const s3Params = {
    Bucket: S3_BUCKET,
    Key: fileName,
  };

  return new Promise((resolve) => {
    s3.deleteObject(s3Params, (err, data) => {
      if(err) {
        console.log(err);
        resolve({success: false, error: err})
      }  else {
        resolve({success:true});  
      }
    });

  });
}

module.exports = function (server, mongoose, logger) {
    server.route({
      method: 'POST',
      path: '/s3_delete',
      config: {
        handler: s3_delete,
        auth: Auth.strategy,
        tags: ['api'],
        plugins: {
          'hapi-swagger': {}
        }
      }
    })
}