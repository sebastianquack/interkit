module.exports = function (mongoose) {
  let modelName = "file";
  let Types = mongoose.Schema.Types;
  let Schema = new mongoose.Schema({
    filename: {
      type: Types.String,
      unique: false,
      required: true,
    },
    mimetype: {
      type: Types.String,
      unique: false,
      required: false,
    },
    simpletype: {
      type: Types.String,
      unique: false,
      required: false,
    },      
    path: {
      type: Types.String,
      unique: false,
      required: true,
    },
    project: {
      type: Types.ObjectId,
      ref: "project",
    }
  });
  
  Schema.statics = {
    collectionName: modelName,
    routeOptions: {
      readAuth: false,
      createAuth: false,
      updateAuth: false,
      associations: {
        project: {
          type: "MANY_ONE",
          model: "project",
        },
      },
    }
  };
  
  return Schema;
};