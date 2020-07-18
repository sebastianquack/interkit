'use strict'
let mongoose = require('mongoose')
require('dotenv-safe').config()  

const boardModel = require('../models/board.model')
const Board = mongoose.model("board", boardModel(mongoose));

mongoose.connection.on('error', console.error.bind(console, 'connection error:'));
mongoose.connect(process.env.MONGODB_URI, {useNewUrlParser: true});

module.exports.description = "add key to boards"

module.exports.up = async function (next) {
  const boards = await Board.find({ key: { $exists: false } })
  console.log(boards)
  let i = 0
  for (const doc of boards) {
    i++
    const key = "board" + i
    console.log("updating " + doc.name + " with key " + key)
    const result = await Board.updateOne({_id:doc._id},{ $set: { 
        key
    }})
  } 
  next()
}

module.exports.down = function (next) {
  next()
}
