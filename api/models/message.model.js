module.exports = function (mongoose) {
  let modelName = "message";
  let Types = mongoose.Schema.Types;
  let Schema = new mongoose.Schema({
    message: {
      type: Types.String
    },    
    label: {
      type: Types.String
    },
    attachment: {
      type: Types.Mixed
    },
    sender: {
      type: Types.ObjectId
    },
    recipients: {
      type: [Types.ObjectId],
      required: true
    },
    board: {
      type: Types.ObjectId,
      required: true
    },
    node: {
      type: Types.ObjectId,
      required: true
    },
    timestamp: {
      type: Types.Date,
      default: Date.now
    },
    system: {
      type: Types.Boolean
    },
    params: {
      type: Types.Mixed,
      default: {}
    },
    seen: {
      type: Types.Boolean,
    },
  });
  
  Schema.statics = {
    collectionName: modelName,
    routeOptions: {
      readAuth: false,
    },
  };
  
  return Schema;
};