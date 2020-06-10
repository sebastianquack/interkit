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
      create: {
        post: async (document, request, result, Log)  => {
          await configureBoardLogs(document._id);
          return document;
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