module.exports = function (mongoose) {
  let modelName = "board";
  let Types = mongoose.Schema.Types;
  let Schema = new mongoose.Schema({
    name: {
      type: Types.String,
      required: true,
      unique: true
    }
  });
  
  Schema.statics = {
    collectionName: modelName,
    routeOptions: {
      readAuth: false,
       associations: {
        scriptNodes: {
          type: "ONE_MANY",
          foreignField: "board",
          model: "scriptNode"
        }
      }
    }
  };
  
  return Schema;
};