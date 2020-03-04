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
      enum: ['marker'],
    },
    project: {
      type: Types.ObjectId,
      ref: "project"
    },
  });
  
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
    }
  };
  
  return Schema;
};