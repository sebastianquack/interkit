module.exports = function (mongoose) {
  let modelName = "variable";
  let Types = mongoose.Schema.Types;
  let Schema = new mongoose.Schema({
    key: {
      type: Types.String,
      required: true,
    },
    value: {
      type: Types.Mixed,
    },
    scope: {
      type: Types.String,
      required: true,
      enum: ['player','playerNode', 'node', 'board'],
      default: "player",
    },
    player: {
      type: Types.ObjectId,
      ref: "player"
    },
    node: {
      type: Types.ObjectId,
      ref: "scriptNode"
    },
    board: {
      type: Types.ObjectId,
      ref: "board"
    },
  });
  
  Schema.statics = {
    collectionName: modelName,
    routeOptions: {
      readAuth: false,
      createAuth: false,
      updateAuth: false,
      associations: {
        player: {
          type: "MANY_ONE",
          model: "player"
        },
        node: {
          type: "MANY_ONE",
          model: "scriptNode"
        },
        board: {
          type: "MANY_ONE",
          model: "board"
        },
      },
    }
  };
  
  return Schema;
};