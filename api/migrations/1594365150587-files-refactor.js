'use strict'
let mongoose = require('mongoose')
require('dotenv-safe').config()  

const fileModel = require('../models/file.model')
const fileSchema = fileModel(mongoose)
const File = mongoose.model("file", fileSchema);

console.log("connecting to " + process.env.MONGODB_URI)
mongoose.connect(process.env.MONGODB_URI, {useNewUrlParser: true});
mongoose.connection.on('error', console.error.bind(console, 'connection error:'));

module.exports.up = async function (next) {

  const files = await File.find({ key: { $exists: false } })
  await files.forEach(async function(doc) {
    console.log("updating " + doc.path, doc._id)
    const result = await File.updateOne({_id:doc._id},{ $set: { 
        key: doc.filename,
        name: doc.filename,
        uploadedFilename: doc.filename,
        authored: true
    }})
    //console.log(result)
  })
  next()

}

module.exports.down = function (next) {
  next()
}
