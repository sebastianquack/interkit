const Boom = require("@hapi/boom");
const BSON = require('bson');
const fs = require('fs');
const archiver = require('archiver');
const StreamZip = require('node-stream-zip');
const slugify = require('slugify');
const dateFormat = require('dateformat');
const aws = require('aws-sdk'); 

const Auth = require("../plugins/auth.plugin.js");
const { s3config, S3_BUCKET } = require('../src/s3')
const { getAllOfProject, insertProjectAsDuplicate } = require('../src/dbutil')
const { generateFilename } = require('../../shared/common')

var dir = './public/tmp'
var downloadPath = '/tmp'
var localFilenamePrefix = "export"

const hostname = require('os').hostname()
const uploadTokens = new Set();

if (fs.existsSync(dir)){
  fs.readdir(dir, (error, files) => {
    if (error) throw error;
    files
      .filter(name => name.indexOf(localFilenamePrefix) === 0)
      .forEach(f => {
        console.log("removing " + dir + "/" + f)
        fs.unlinkSync(dir + "/" + f)
      });
  });
}

const uploadToken = async (request, mongoose, logger) => {
  const crypto = require('crypto')
  const uploadToken = crypto.createHash('sha1').update(Math.random().toString()).digest('hex');
  uploadTokens.add(uploadToken)
  return {uploadToken, hostname}
}

const makeFilename = (prefix="export", hostname="unknownorigin", extension = ".zip") => {
  const date = dateFormat(new Date(), "yyyy-mm-dd-HH-MM")
  const filename = [prefix, hostname, date].join("_") + extension
  return filename
}

const exportData = async (request, mongoose, logger) => {

  if (request.query.projectId) {
    const projectId = request.query.projectId
    console.log("exportData: exporting project", projectId);

    const data = await getAllOfProject(projectId)

    if (!data.project) {
      throw Boom("invalid project or project not found");
    }

    const secret = require('crypto').createHash('sha1').update(Math.random().toString()).digest('hex');
    
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir);
    }

    const localFilename = `${localFilenamePrefix}${secret}.zip`
    const downloadUrl = `${downloadPath}/${localFilename}`
    const filePath = `${dir}/${localFilename}`

    const filename = makeFilename(`interkit-project-${slugify(data.project.name)}`, slugify(hostname))

    const out = {
      projectName: data.project.name,
      timestamp: Date.now(),
      request: request.query,
      hostname,
      success: true, 
      filename,
      data//: EJSON.stringify(data),
    }

    // create zip archive
    var output = fs.createWriteStream(filePath);
    var archive = archiver('zip', {
      zlib: { level: 1 } // Sets the compression level.
    });
    
    output.on('close', function() {
      console.log(archive.pointer() + ' total bytes written to zip archive ' + filePath);
      // TODO remove the file after a timeout & remove all on restart
    });
    output.on('end', function() {
      console.log('Data has been drained');
    });    

    // good practice to catch warnings (ie stat failures and other non-blocking errors)
    archive.on('warning', function(err) {
      if (err.code === 'ENOENT') {
        console.log("ENOENT " + filePath.zip)
      } else {
        throw err;
      }
    });
    
    // good practice to catch this error explicitly
    archive.on('error', function(err) {
      console.log(err)
      throw err;
    });
    
    // pipe archive data to the file
    archive.pipe(output);

    // add json data to zip archive
    archive.append(JSON.stringify(out), { name: 'project.json' });
    archive.append(BSON.serialize(out), { name: 'project.bson' });
    
    // add files to zip archive
    const s3 = new aws.S3();
    for (const file of out.data.files) {
      // TODO make this run sequentially !!
      var s3Stream = s3.getObject({Bucket: S3_BUCKET, Key: file.path}).createReadStream();
      archive.append(s3Stream, { name: "files/" + file.path })
    }
    
    await archive.finalize();

    //console.log(out)
    console.log("export done")

    return {
      filename,
      downloadUrl,
    }

  } else {
    error = "missing project id"
    return {success:false, error }
  }
}

const importData = async (request, mongoose, logger) => {

  //if (!request.query.uploadToken || !uploadTokens.has(request.query.uploadToken)) {
  //  throw Boom.unauthorized("wrong or missing downloadToken.");
  //}; uploadTokens.delete(request.query.uploadToken)
//
  //console.log(EJSON.parse(request.payload.data))

  //console.log(request.payload)

  return new Promise( resolve => {

    const errorMessages = []

    const zip = new StreamZip({
        file: request.payload.path,
        storeEntries: true
    });
    
    // Handle errors
    zip.on('error', err => { console.log(err) });

    zip.on('ready', async () => {
      // list entries
      console.log('Entries read: ' + zip.entriesCount);
      for (const entry of Object.values(zip.entries())) {
          const desc = entry.isDirectory ? 'directory' : `${entry.size} bytes`;
          console.log(`Entry ${entry.name}: ${desc}`);
      }

      // unzip
      const bson = zip.entryDataSync('project.bson')//.toString();
      const obj = BSON.deserialize(bson)
      let data = obj.data
    
      console.log(`importing project "${obj.projectName}"`)

      // upload files with new filename

      if (data.files) {
        // generate new filenames
        filenameMappings = data.files.map(file => ({
          old: file.filename,
          new: generateFilename()
        }))
        
        const s3 = new aws.S3();

        for (file of data.files) {

          console.log(`uploading ${file.filename}`)

          try {
            const fileBuffer = zip.entryDataSync('files/' + file.path);
            const newFilename = filenameMappings.find(n => n.old === file.path).new

            var params = {
              Body: fileBuffer, 
              Bucket: S3_BUCKET, 
              Key: newFilename, 
              ContentType: file.mimetype
            };
            try {
              const result = await s3.putObject(params).promise();
              console.log("upload success", result)

              console.log(`uploaded file ${file.filename} as ${newFilename}`)

              file.filename = newFilename
              file.path = newFilename

            } catch(error) {
              console.log("upload error", error)
              errorMessages.push("upload error " + file.name)
            }

          } catch(error) {
            console.log("unzip error", error)
            errorMessages.push("unzip error " + file.name)
          }
    
        }
      }

      //const project = data.project

      const newProjectName = obj.filename ? 
          `${obj.projectName} (imported from ${obj.filename} at ${dateFormat(new Date(), "yyyy-mm-dd-HH-MM-ss")})`
        : `${obj.projectName} (imported ${dateFormat(new Date(), "yyyy-mm-dd-HH-MM-ss")})` 

      insertProjectAsDuplicate(data, newProjectName)

      //console.log(project)

      // Do not forget to close the file once you're done
      zip.close()

      resolve({ errorMessages })
    });

  })


  //const payload = {
  //  ...request.payload,
  //  datas: EJSON.fromJSONValue(request.payload.data)
  //}
  //console.log(payload)
  //insertProjectAsDuplicate(request.payload.data)
  
}

module.exports = function (server, mongoose, logger) {

    server.route({
      method: 'GET',
      path: '/uploadToken',
      config: {
        handler: request => uploadToken(request, mongoose, logger),
        auth: Auth.strategy,
        tags: ['api'],
        plugins: {
          'hapi-swagger': {}
        }
      }
    })    

    server.route({
      method: 'GET',
      path: '/export',
      config: {
        handler: request => exportData(request, mongoose, logger),
        auth: false,
        tags: ['api'],
        plugins: {
          'hapi-swagger': {}
        }
      }
    })

    server.route({
      method: 'PUT',
      path: '/export',
      config: {
        handler: request => importData(request, mongoose, logger),
        auth: false,
        tags: ['api'],
        payload: {
          output: 'file',
          parse: false,
          allow: 'application/zip',
          maxBytes: 1000000000, // 1G
        },        
        plugins: {
          'hapi-swagger': {}
        }
      }
    })    

}

/*

server.route({
  method: 'POST',
  path: '/submit',
  handler: (request, h) => {

      const data = request.payload;
      if (data.file) {
          const name = data.file.hapi.filename;
          const path = __dirname + "/uploads/" + name;
          const file = fs.createWriteStream(path);

          file.on('error', (err) => console.error(err));

          data.file.pipe(file);

          data.file.on('end', (err) => { 
              const ret = {
                  filename: data.file.hapi.filename,
                  headers: data.file.hapi.headers
              }
              return JSON.stringify(ret);
          })
      }
      return 'ok';
  },
  options: {
      payload: {
          output: 'stream',
          parse: true,
          allow: 'multipart/form-data'
      }
  }
});

*/