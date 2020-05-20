let RestHapi = require('rest-hapi')
let Joi = require('@hapi/joi')
let Auth = require("../plugins/auth.plugin.js");

module.exports = function (mongoose) {
  let modelName = "project";
  let Types = mongoose.Schema.Types;
  let Schema = new mongoose.Schema({
    name: {
      type: Types.String,
      required: true,
      unique: true
    }

  });
  
  Schema.statics = {
    collectionName: modelName,
    routeOptions: {
      readAuth: false,
       associations: {
        boards: {
          type: "ONE_MANY",
          foreignField: "project",
          model: "board"
        },
        users: {
          type: "MANY_MANY",
          model: "user",
        },
        files: {
          type: "ONE_MANY",
          foreignField: "project",
          model: "file"
        },
      },
    },
  };
  
  return Schema;
};



