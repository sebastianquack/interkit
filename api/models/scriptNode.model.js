module.exports = function (mongoose) {
  let modelName = "scriptNode";
  let Types = mongoose.Schema.Types;
  let Schema = new mongoose.Schema({
    name: {
      type: Types.String,
      required: true,
      unique: true
    },
    initScript: {
      type: Types.String,
    },
    responseScript: {
      type: Types.String,
    }
  });
  
  Schema.statics = {
    collectionName: modelName,
    routeOptions: {
      readAuth: false
    }
  };
  
  return Schema;
};