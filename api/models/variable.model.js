let Joi = require('@hapi/joi')
let RestHapi = require('rest-hapi')
let Auth = require("../plugins/auth.plugin.js");

function valueUpdate(server, model, options, logger) {
  const Log = logger.bind("Variable Value Update")
  let Boom = require('@hapi/boom')

  let collectionName = model.collectionDisplayName || model.modelName

  let handler = async function (request, h) {
    try {
      let value = request.payload.value;
      console.log(value, typeof value)
      let result = await RestHapi.update(model, request.params._id, {value: value}, Log)
      if (result) {
        return h.response("Value updated.").code(200)
      }
      else {
        throw Boom.notFound("No resource was found with that id.")
      }
    } catch(err) {
      if (!err.isBoom) {
        Log.error(err)
        throw Boom.badImplementation(err)
      } else {
        throw err
      }
    }
  }

  server.route({
    method: 'PUT',
    path: '/variable/{_id}/valueUpdate',
    config: {
      handler: handler,
      auth: Auth.strategy,
      description: 'Update a variable value',
      tags: ['api'],
      validate: {
        params: {
          _id: Joi.string().required()
        },
        payload: {
          value: Joi.required().description('boolean, number or string is ok')
        }
      },
      plugins: {
        'hapi-swagger': {
          responseMessages: [
            {code: 200, message: 'Success'},
            {code: 400, message: 'Bad Request'},
            {code: 404, message: 'Not Found'},
            {code: 500, message: 'Internal Server Error'}
          ]
        }
      }
    }
  })
} 

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
    scope: {
      type: Types.String,
      required: true,
      enum: ['player','playerNode', 'node', 'board'],
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
      },
      extraEndpoints: [
        valueUpdate
      ]
    }
  };
  
  return Schema;
};