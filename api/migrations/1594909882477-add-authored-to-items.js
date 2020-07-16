'use strict'
let mongoose = require('mongoose')
require('dotenv-safe').config()  

const itemModel = require('../models/item.model')
const Item = mongoose.model("item", itemModel(mongoose));

mongoose.connection.on('error', console.error.bind(console, 'connection error:'));
mongoose.connect(process.env.MONGODB_URI, {useNewUrlParser: true});

module.exports.description = "add authored to items"

module.exports.up = async function (next) {
  const count = await Item.updateMany({}, { $set: { authored: true }})
  console.log("migrated " + count.nModified + " items", count)
  next()
}

module.exports.down = function (next) {
  next()
}
