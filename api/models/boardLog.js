module.exports = function (mongoose) {
  let modelName = "boardLog";
  let Types = mongoose.Schema.Types;
  let Schema = new mongoose.Schema({
    listed: {
      type: Types.Boolean,
      default: false
    },
    player: {
      type: Types.ObjectId,
      ref: "player"
    },
    board: {
      type: Types.ObjectId,
      ref: "board"
    },
    project: {
      type: Types.ObjectId,
      ref: "project"
    },
    // save each players current node for a board here for easy reference
    currentNode: {
      type: Types.ObjectId
    }
  });
  
  Schema.statics = {
    collectionName: modelName,
    routeOptions: {
      readAuth: false,
      associations: {
        player: {
          type: "MANY_ONE",
          model: "player"
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
      ]    
    }
  };
  
  return Schema;
};