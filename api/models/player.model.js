const RestHapi = require('rest-hapi')
const Log = RestHapi.getLogger('players');

module.exports = function (mongoose) {
  let modelName = "player";
  let Types = mongoose.Schema.Types;
  let Schema = new mongoose.Schema({  
    moveCounter: {
      type: Types.Number,
    }
  });

  const removeAssociatedData = async (playerId) => {
    console.log("deleting associated data for player ", playerId);

    let nodeLogs = await RestHapi.list(RestHapi.models.nodeLog, {
          player: playerId,
    }, Log);
    await RestHapi.deleteMany(RestHapi.models.nodeLog, nodeLogs.docs, Log);

    let variables = await RestHapi.list(RestHapi.models.variable, {
          player: playerId,
    }, Log);
    await RestHapi.deleteMany(RestHapi.models.variable, variables.docs, Log);

    // todo: messages?

    let itemAssociations = await RestHapi.getAll(RestHapi.models.player, playerId, RestHapi.models.item, "items", {}, Log);
    if(itemAssociations.docs.length)
      await RestHapi.removeMany(RestHapi.models.player, playerId, RestHapi.models.item, "items", itemAssociations.docs)
    
  }
  
  Schema.statics = {
    collectionName: modelName,
    routeOptions: {
      readAuth: false,
      createAuth: false,
      associations: {
        items: {
          type: "MANY_MANY",
          model: "item"
        }
      },
      delete: {
        pre: async (_id, hardDelete, request, Log) => {
          await removeAssociatedData(_id);
          return null;
        }
      }
    },
  };
  
  return Schema;
};