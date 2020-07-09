let Joi = require('@hapi/joi')
let RestHapi = require('rest-hapi')
let Auth = require("../plugins/auth.plugin.js");

const gameServer = require("../src/gameServer.js");

// endpoint to register a player to a node
// - called from client when opening a board for the first time
// - called from authoring when manually moving a player
// - informs socket server to update player if needed
function logPlayerToNode(server, model, options, logger) {
  const Log = logger.bind("logPlayerToNode")
  let Boom = require('@hapi/boom')

  let handler = async function (request, h) {
    try {
      let playerId = request.params._playerId;      
      let nodeId = request.params._nodeId;      

      let arriveFrom = JSON.parse(request.payload);
      console.log("logPlayerToNode payload: ", arriveFrom);
      
      let result = await gameServer.joinNode({
        nodeId, playerId, execOnArrive: true, arriveFrom
      })
      
      if (result) {
        return h.response({status: "ok"}).code(200)
      }
      else {
        throw Boom.notFound("There was a")
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
    path: '/nodeLog/logPlayerToNode/{_playerId}/{_nodeId}',
    config: {
      handler: handler,
      auth: false,
      description: 'log a player to a node',
      tags: ['api'],
      validate: {
        params: {
          _playerId: Joi.string().required(),
          _nodeId: Joi.string().required()
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


// not yet really needed - currently only one nodelog entry per board is kept - can be expanded to history in future
function getHistory(server, model, options, logger) {
  const Log = logger.bind("getHistory")
  let Boom = require('@hapi/boom')

  let handler = async function (request, h) {
    try {
      let playerId = request.params._id;      
      let groupedNodeLogs = {};
      let result = await model.find({ player: playerId }).sort('-timestamp').populate('node', 'name').populate('board', 'name');
      result.forEach((entry)=>{
        if(entry.board) {
          if(!groupedNodeLogs[entry.board._id]) {
            groupedNodeLogs[entry.board._id] = [entry]
          } else {
            groupedNodeLogs[entry.board._id].push([entry]);
          }
        }
      });
      console.log(groupedNodeLogs);

      if (result) {
        return h.response(groupedNodeLogs).code(200)
      }
      else {
        throw Boom.notFound("No history was found with that id.")
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
    path: '/nodeLog/{_id}/getHistory',
    config: {
      handler: handler,
      auth: false,
      description: 'get concise nodelog history for player',
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


module.exports = function (mongoose) {
  let modelName = "nodeLog";
  let Types = mongoose.Schema.Types;
  let Schema = new mongoose.Schema({
    player: {
      type: Types.ObjectId
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
    },
    timestamp: {
      type: Types.Date,
      default: Date.now
    },
  });
  
  Schema.statics = {
    collectionName: modelName,
    routeOptions: {
      readAuth: false,
      associations: {
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
        getHistory,
        logPlayerToNode
      ]    
    }
  };
  
  return Schema;
};