let RestHapi = require('rest-hapi')
let Joi = require('@hapi/joi')
let Auth = require("../plugins/auth.plugin.js");
const Log = RestHapi.getLogger('board');

module.exports = function (mongoose) {
  let modelName = "board";
  let Types = mongoose.Schema.Types;
  let Schema = new mongoose.Schema({
    key: {
      type: Types.String,
      required: true,
    },
    name: {
      type: Types.String,
      required: true,
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
    },
    project: {
      type: Types.ObjectId,
      ref: "project"
    },
    offsetX: {
      type: Types.Number,
      default: 0
    },
    offsetY: {
      type: Types.Number,
      default: 0
    },
    zoom: {
      type: Types.Number,
      default: 1
    }

  });

  // sets up board logs for all players when board is created
  const configureBoardLogs = async (board) => {

    console.log("updating boardLogs for all players for board ", board);
    
    let players;
    try {
      players = await RestHapi.list(RestHapi.models.player, null, Log);
    } catch(e) {
      console.log(e)
    }

    for(let player of players.docs) {

      let query = {
        player: player._id,  
        board: board._id,
        project: board.project
      }
      let boardLogItems = await RestHapi.list(RestHapi.models.boardLog, query, Log);

      if(boardLogItems.docs.length == 0) {
        await RestHapi.create(RestHapi.models.boardLog, {
          ...query,
          listed: board.listed
        })  
      } else {
        await RestHapi.update(RestHapi.models.boardLog, boardLogItems.docs[0]._id, {
          ...query,
          listed: board.listed
        })
      }
    }
  }

  const removeAssociatedData = async (boardId) => {
    let boardLogs = await RestHapi.list(RestHapi.models.boardLog, {board: boardId}, Log);
    if(boardLogs.docs.length)
      await RestHapi.deleteMany(RestHapi.models.boardLog, boardLogs.docs, Log);
  }
  
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
        },
        project: {
          type: "MANY_ONE",
          model: "project"
        },
        items: {
          type: "MANY_MANY",
          model: "item"
        }
      },

      create: {
        post: async (document, request, result, Log)  => {
          await configureBoardLogs(document);
          return document;
        }
      },

      update: {
        pre: async (_id, payload, request, Log) => {
          let board = await RestHapi.find(RestHapi.models.board, _id, {}, Log);
          if(board.listed != payload.listed) {
            await configureBoardLogs(payload); // todo: make this step optional in authoring  
          }
          return payload;
        }
      },

      delete: {
        pre: async (_id, hardDelete, request, Log) => {
          await removeAssociatedData(_id);
          return null;
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



