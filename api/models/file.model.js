module.exports = function (mongoose) {
  let modelName = "file";
  let Types = mongoose.Schema.Types;
  let Schema = new mongoose.Schema({
    key: {                    // a unique key that remains unchanged, even if project is duplicated
      type: Types.String,
      unique: true,
      required: true,
    },
    name: {                   // a human readable name
      type: Types.String,
      unique: false,
      required: false,
    },
    alt: {                    // alt text / description of visible content
      type: Types.String,
      unique: false,
      required: false,
    },    
    uploadedFilename: {       // original filename when it was uploaded
      type: Types.String,
      unique: false,
      required: false,
    },            
    filename: {               // physical filename
      type: Types.String,
      unique: false,
      required: true,
    },
    mimetype: {
      type: Types.String,
      unique: false,
      required: false,
    },
    simpletype: {             // just "image" or "audio"
      type: Types.String,
      unique: false,
      required: false,
    },      
    path: {                   // currently same as filename
      type: Types.String,
      unique: false,
      required: true,
    },
    project: {
      type: Types.ObjectId,
      ref: "project",
    },
    authored: {               // true means it's part of the project, false means it's a user upload
      type: Types.Boolean,
      unique: false,
      required: false,
    },    
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