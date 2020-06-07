module.exports = function (mongoose) {
  let modelName = "page";
  let Types = mongoose.Schema.Types;
  let Schema = new mongoose.Schema({
    menuEntry: {
      type: Types.String,
    },
    menuOrder: {
      type: Types.Number,
    },
    content: {
      type: Types.String,
    },
    project: {
      type: Types.ObjectId,
      ref: "project"  
    }
    
  });
  
  Schema.statics = {
    collectionName: modelName,
    routeOptions: {
      readAuth: false,
      project: {
        type: "MANY_ONE",
        model: "project"
      }
    }
  };
  
  return Schema;
};