let Joi = require('@hapi/joi')
let RestHapi = require('rest-hapi')

// endpoint to for chat to load messages
function selectForChat(server, model, options, logger) {
  const Log = logger.bind("logPlayerToNode")
  let Boom = require('@hapi/boom')

  let handler = async function (request, h) {
    try {

      let query = { 
        board: request.query.boardId, // from this board
        $or: [
          {sender: request.query.playerId}, // can be sent by player
          {recipients: request.query.playerId} // or received by player
        ],
        timestamp: {$lt: request.query.showItemsSince}, // in the right timespan
        scheduled: {$ne: true}, // not scheduled
        $and: [
          {
            $or: [
              {'params.hideOwnInput': {$ne: true}}, // hideOwnInput can be false
              {
                $and: [                              
                    {'params.hideOwnInput': true}, // if its true
                    {recipients: {$not: {$size: 0}}} // recipients should't be empty
                ]
              }
            ]
          },
          {
            $or: [{'params.interfaceCommand': {$exists: false}}, // can have interfaceCommand not set
              {$and: [                                             
                {'params.interfaceCommand': {$exists: true}},     // or if its set
                {seen: {$nin: [request.query.boardId]}}           // we shouldn't have seen it yet
              ]}
            ]
          }
        ]
      }

      //console.log(query)

      let result = await model.find(query).sort({timestamp: -1}).limit(request.query.limit)
      //console.log("selectForChat", result)
      
      if (result) {
        return h.response({docs: result}).code(200)
      }
      else {
        throw Boom.notFound("error handling message")
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
    method: 'GET',
    path: '/message/selectForChat',
    config: {
      handler: handler,
      auth: false,
      description: 'get messages for chat',
      tags: ['api'],
      validate: {
        query: {
          boardId: Joi.string(),
          playerId: Joi.string(),
          showItemsSince: Joi.number(),
          limit: Joi.number(),
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
    timestamp: {              // primary sorting attribute
      type: Types.Number
    },
    outputOrder: {            // secondary sorting if timestamp is identical
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
        selectForChat,
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