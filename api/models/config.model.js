module.exports = function (mongoose) {
  let modelName = "config";
  let Types = mongoose.Schema.Types;
  let Schema = new mongoose.Schema({
    key: {
      type: Types.String,
      required: true,
      unique: true
    },
    type: {
      type: Types.String,
      enum: ['text', 'number']
    },
    value: {
      type: Types.String,
      unique: false
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