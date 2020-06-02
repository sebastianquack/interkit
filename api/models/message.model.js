let Joi = require('@hapi/joi')
let RestHapi = require('rest-hapi')

module.exports = function (mongoose) {
  let modelName = "message";
  let Types = mongoose.Schema.Types;
  let Schema = new mongoose.Schema({
    message: {
      type: Types.String
    },    
    label: {
      type: Types.String
    },
    attachment: {
      type: Types.Mixed
    },
    sender: {
      type: Types.ObjectId
    },
    recipients: {
      type: [Types.ObjectId],
      required: true
    },
    board: {
      type: Types.ObjectId,
      required: true
    },
    node: {
      type: Types.ObjectId,
      required: true
    },
    timestamp: {
      type: Types.Number
    },
    system: {
      type: Types.Boolean
    },
    params: {
      type: Types.Mixed,
      default: {}
    },
    seen: {
     type: [Types.ObjectId],
     default: []
    },
    scheduled: {
      type: Types.Boolean
    },
    deliveryTime: {
      type: Types.Number
    }
  });
  
  Schema.statics = {
    collectionName: modelName,
    routeOptions: {
      readAuth: false,
      extraEndpoints: [
        // mark as seen endpooint
        function (server, model, options, logger) {
          let collectionName = model.collectionDisplayName || model.modelName
          const Log = logger.bind("mark as seen")
          let Boom = require('@hapi/boom')

          let handler = async function (request, h) {
            try {
              let message = await RestHapi.find(model, request.params._id, {}, Log);
              if (message) {
                if(!message.seen) message.seen = [];
                
                if(message.seen.indexOf(request.params._playerId) == -1) {
                  message.seen.push(request.params._playerId);
                }
                //console.log("seen", message.seen);
                let result = await RestHapi.update(model, request.params._id, {
                  seen: message.seen
                }, Log)

                if(result)
                  return h.response('{"ok": "true"}').code(200)
                else 
                  return h.response('{"error": "true"}').code(200)
              }
              else {
                throw Boom.notFound("No resource was found with that id.")
              }
            } catch(err) {
              if (!err.isBoom) {
                throw Boom.badImplementation(err)
              } else {
                throw err
              }
              console.log("error", err);
            }
          }

          server.route({
            method: 'PUT',
            path: '/message/{_id}/markAsSeen/{_playerId}',
            config: {
              handler: handler,
              auth: false,
              description: 'mark as seen',
              tags: ['api'],
              validate: {
                params: {
                  _id: Joi.string().required(),
                  _playerId: Joi.string().required(),
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
    }
  };
  
  return Schema;
};