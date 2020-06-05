const RestHapi = require('rest-hapi')
const Log = RestHapi.getLogger('items');

module.exports = function (mongoose) {
  let modelName = "item";
  let Types = mongoose.Schema.Types;
  let Schema = new mongoose.Schema({
    key: {
      type: Types.String,
      required: true,      
    },
    value: {
      type: Types.Mixed,
    },
    type: {
      type: Types.String,
      required: true,
    },
    project: {
      type: Types.ObjectId,
      ref: "project"
    },
  });

  const removeAssociatedData = async (itemId) => {

    let playerAssociations = await RestHapi.getAll(RestHapi.models.item, itemId, RestHapi.models.player, "players", {}, Log);
    console.log("foo", playerAssociations);
    if(playerAssociations.docs.length)
      await RestHapi.removeMany(RestHapi.models.item, itemId, RestHapi.models.player, "players", playerAssociations.docs)
    
  }
  
  Schema.statics = {
    collectionName: modelName,
    routeOptions: {
      readAuth: false,
      createAuth: false,
      updateAuth: false,
      associations: {
        players: {
          type: "MANY_MANY",
          model: "player"
        },
        project: {
          type: "MANY_ONE",
          model: "project"
        },
      
      },
      delete: {
        pre: async (_id, hardDelete, request, Log) => {
          await removeAssociatedData(_id);
          return null;
        }
      }
    }
  };
  
  return Schema;
};