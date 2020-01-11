const RestHapi = require('rest-hapi')
const Log = RestHapi.getLogger('connections');

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
    
    console.log("payload", payload);

    if(typeof payload.script !== "undefined") {

      let connectedNodeNames = [];
      let connectedNodeIds = [];

      let regex1 = /(?:moveTo\(\")(.+)(?:\"\))/g    
      while ((array1 = regex1.exec(payload.script)) !== null) {
        connectedNodeNames.push(array1[1]);
      } 
      console.log("found connections: ", connectedNodeNames);

      for(let i = 0; i < connectedNodeNames.length; i++) {
        let n = await RestHapi.list(RestHapi.models.scriptNode, {name: connectedNodeNames[i]}, Log);
        if(n.docs.length == 1) {
          connectedNodeIds.push(n.docs[0]._id);
        }
      }
      console.log("found ids:", connectedNodeIds);

      payload.connectionIds = connectedNodeIds;
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