module.exports = function (mongoose) {
  let modelName = "projectLog";
  let Types = mongoose.Schema.Types;
  let Schema = new mongoose.Schema({
    player: {
      type: Types.ObjectId,
      ref: "player"
    },
    project: {
      type: Types.ObjectId,
      ref: "project"
    },
  });
  
  Schema.statics = {
    collectionName: modelName,
    routeOptions: {
      createAuth: false,
      readAuth: false,
      associations: {
        player: {
          type: "MANY_ONE",
          model: "player"
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