const RestHapi = require('rest-hapi')
const Log = RestHapi.getLogger('players');
const Auth = require("../plugins/auth.plugin.js");

const gameServer = require("../src/gameServer.js");

// endpoint to for player to input a message
// - called from client when user sends somthing
function message(server, model, options, logger) {
  const Log = logger.bind("logPlayerToNode")
  let Boom = require('@hapi/boom')

  let handler = async function (request, h) {
    try {
      let msgData = JSON.parse(request.payload);
      
      let result = await gameServer.handlePlayerMessage(msgData);
      
      if (result) {
        return h.response({status: "ok"}).code(200)
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
    method: 'POST',
    path: '/player/message',
    config: {
      handler: handler,
      auth: false,
      description: 'send a message',
      tags: ['api'],
      validate: {
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
  let modelName = "player";
  let Types = mongoose.Schema.Types;
  let Schema = new mongoose.Schema({  
    moveCounter: {
      type: Types.Number,
    }
  });

  // sets up board logs for new player with current listed configuration of boards
  const configureBoardLogs = async (playerId) => {
    console.log("create board logs for ", playerId)

    let boards = await RestHapi.list(RestHapi.models.board, {}, Log);

    for(let board of boards.docs) {
      await RestHapi.create(RestHapi.models.boardLog, {
        player: playerId, 
        board: board._id, 
        project: board.project,
        listed: board.listed
      })
    }
  }

  const removeAssociatedData = async (playerId) => {
    console.log("deleting associated data for player ", playerId);

    let nodeLogs = await RestHapi.list(RestHapi.models.nodeLog, {
          player: playerId,
    }, Log);
    await RestHapi.deleteMany(RestHapi.models.nodeLog, nodeLogs.docs, Log);

    let projectLogs = await RestHapi.list(RestHapi.models.projectLog, {
          player: playerId,
    }, Log);
    await RestHapi.deleteMany(RestHapi.models.projectLog, projectLogs.docs, Log);

    let variables = await RestHapi.list(RestHapi.models.variable, {
          player: playerId,
    }, Log);
    await RestHapi.deleteMany(RestHapi.models.variable, variables.docs, Log);

    // todo: messages?

    let itemAssociations = await RestHapi.getAll(RestHapi.models.player, playerId, RestHapi.models.item, "items", {}, Log);
    if(itemAssociations.docs.length) {
      console.log("deleting associations", itemAssociations.docs)
      await RestHapi.removeMany(RestHapi.models.player, playerId, RestHapi.models.item, "items", itemAssociations.docs)
    }
    
  }
  
  Schema.statics = {
    collectionName: modelName,
    routeOptions: {
      readAuth: false,
      createAuth: false,
      updateAuth: false,
      associations: {
        items: {
          type: "MANY_MANY",
          model: "item",
          linkingModel: "player_item"
        }
      },
      create: {
        post: async (document, request, result, Log)  => {
          await configureBoardLogs(document._id);
          return document;
        }
      },
      delete: {
        pre: async (_id, hardDelete, request, Log) => {
          console.log("PREDELETE")
          await removeAssociatedData(_id);
          return null;
        }
      },
      extraEndpoints: [
        message
      ]
    },
  };
  
  return Schema;
};