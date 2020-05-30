let Joi = require('@hapi/joi')
let RestHapi = require('rest-hapi')
let Auth = require("../plugins/auth.plugin.js");

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
        if(!groupedNodeLogs[entry.board._id]) {
          groupedNodeLogs[entry.board._id] = [entry]
        } else {
          groupedNodeLogs[entry.board._id].push([entry]);
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
        getHistory
      ]    
    }
  };
  
  return Schema;
};