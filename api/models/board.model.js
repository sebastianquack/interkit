let RestHapi = require('rest-hapi')
let Joi = require('@hapi/joi')
let Auth = require("../plugins/auth.plugin.js");

module.exports = function (mongoose) {
  let modelName = "board";
  let Types = mongoose.Schema.Types;
  let Schema = new mongoose.Schema({
    name: {
      type: Types.String,
      required: true,
      unique: true
    },
    description: {
      type: Types.String,
    },
    listed: {
      type: Types.Boolean,
      default: false
    },
    startingNode: {
      type: Types.ObjectId,
      ref: "scriptNode"
    },
    library: {
      type: Types.String
    } 
  });
  
  Schema.statics = {
    collectionName: modelName,
    routeOptions: {
      readAuth: false,
       associations: {
        scriptNodes: {
          type: "ONE_MANY",
          foreignField: "board",
          model: "scriptNode"
        },
        startingNode: {
          type: "ONE_ONE",
          model: "scriptNode"
        }
      },

      extraEndpoints: [
        // remove startingNode endpoint
        function (server, model, options, logger) {
          const Log = logger.bind("remove starting node")
          let Boom = require('@hapi/boom')

          let collectionName = model.collectionDisplayName || model.modelName

          let handler = async function (request, h) {
            try {
              let result = await RestHapi.update(model, request.params._id, {startingNode: undefined}, Log)
              if (result) {
                return h.response('{"ok": "true"}').code(200)
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
            path: '/board/{_id}/removeStartingNode',
            config: {
              handler: handler,
              auth: Auth.strategy,
              description: 'remove the starting node from a board',
              tags: ['api'],
              validate: {
                params: {
                  _id: Joi.string().required()
                },
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
      ]
    },
  };
  
  return Schema;
};



