let Joi = require('@hapi/joi')
let RestHapi = require('rest-hapi')
let Auth = require("../plugins/auth.plugin.js");

module.exports = function (mongoose) {
  let modelName = "variable";
  let Types = mongoose.Schema.Types;
  let Schema = new mongoose.Schema({
    key: {
      type: Types.String,
      required: true,
    },
    value: {
      type: Types.Mixed,
    },
    stringValue: { // this is for pretty display in the editor
      type: Types.String,
    },
    varType: {
      type: Types.String,
    },
    varScope: {
      type: Types.String,
      required: true,
      enum: ['player', 'playerNode', 'node', 'board', 'project'],
      default: "player",
    },
    player: {
      type: Types.ObjectId,
      ref: "player"
    },
    node: {
      type: Types.ObjectId,
      ref: "scriptNode"
    },
    board: {
      type: Types.ObjectId,
      ref: "board"
    },
    project: {
      type: Types.ObjectId,
      ref: "project"
    }
  });
  
  Schema.statics = {
    collectionName: modelName,
    routeOptions: {
      readAuth: false,
      createAuth: false,
      updateAuth: false,
      associations: {
        player: {
          type: "MANY_ONE",
          model: "player"
        },
        node: {
          type: "MANY_ONE",
          model: "scriptNode"
        },
        board: {
          type: "MANY_ONE",
          model: "board"
        },
        project: {
          type: "MANY_ONE",
          model: "project"
        }
      },
      extraEndpoints: [
      ]
    }
  };
  
  return Schema;
};