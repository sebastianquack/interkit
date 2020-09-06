const RestHapi = require('rest-hapi')
const Log = RestHapi.getLogger('connections');
const db = require("../src/dbutil")

const beautify = require('js-beautify');

module.exports = function (mongoose) {
  let modelName = "scriptNode";
  let Types = mongoose.Schema.Types;
  let Schema = new mongoose.Schema({
    name: {
      type: Types.String,
      required: true,
    },
    script: {
      type: Types.String,
    },
    multiPlayer: {
      type: Types.Boolean,
    },
    connectionIds: {
      type: [Types.ObjectId]
    },
    board: {
      type: Types.ObjectId,
      ref: "board"
    },
    posX: {
      type: Types.Number
    }, 
    posY: {
      type: Types.Number
    }
  });

  // scan script for moveTo commands and update connections for this node
  const updateConnections = async (payload) => {
    
    //console.log("payload", payload);

    if(typeof payload.script !== "undefined") {

      // beautify
      payload.script = beautify(payload.script, { indent_size: 2 });

      // update connections
      payload.connectionIds = await db.getConnectedNodeIds(payload);
    }

    return payload;
  }

  Schema.statics = {
    collectionName: modelName,
    routeOptions: {
      readAuth: false,
      associations: {
        board: {
          type: "MANY_ONE",
          model: "board"
        }
      },
      create: {
        pre: (payload, request, Log) => {
          return updateConnections(payload);
        }
      },
      update: {
        pre: (_id, payload, request, Log) => {
          return updateConnections(payload);
        }
      }
    }
  };
  
  return Schema;
};