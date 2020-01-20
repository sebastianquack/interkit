module.exports = function (mongoose) {
  let modelName = "nodeLog";
  let Types = mongoose.Schema.Types;
  let Schema = new mongoose.Schema({
    player: {
      type: Types.ObjectId
    },
    node: {
      type: Types.ObjectId
    },
    board: {
      type: Types.ObjectId
    },
    timestamp: {
      type: Types.Date,
      default: Date.now
    },
  });
  
  Schema.statics = {
    collectionName: modelName,
    routeOptions: {
      readAuth: false
    }
  };
  
  return Schema;
};