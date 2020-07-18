let RestHapi = require('rest-hapi')
let Joi = require('@hapi/joi')
let Auth = require("../plugins/auth.plugin.js");
const db = require("../src/dbutil")

module.exports = function (mongoose) {
  let modelName = "project";
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
        boards: {
          type: "ONE_MANY",
          foreignField: "project",
          model: "board"
        },
        users: {
          type: "MANY_MANY",
          model: "user",
        },
        files: {
          type: "ONE_MANY",
          foreignField: "project",
          model: "file"
        },
      },
      extraEndpoints: [
        duplicate
      ]
    },
  };
  
  return Schema;
};



// endpoint to duplicate project
function duplicate(server, model, options, logger) {
  const Log = logger.bind("duplicateProject")
  let Boom = require('@hapi/boom')

  let handler = async function (request, h) {
    try {
      let msgData = JSON.parse(request.payload);

      if (!request.query.projectId) {
        throw Boom("missing projectId, cannot duplicate")
      }
      console.log("duplicating " + request.query.projectId)
      let result = await db.duplicateProject(request.query.projectId);
      console.log("duplicated " + request.query.projectId + " as " + result)
      
      if (result) {
        return h.response({status: "ok"}).code(200)
      }
      else {
        throw Boom.notFound("error handling message")
      }
    } catch(err) {
      if (!err.isBoom) {
        Log.error(err)
        throw Boom.badImplementation(err)
      } else {
        throw err
      }
    }
  }

  server.route({
    method: 'POST',
    path: '/project/',
    config: {
      handler: handler,
      auth: Auth.strategy,
      description: '?projectId={project._id} duplicate a project including related and contained data',
      tags: ['api'],
      //validate: {
      //},
      plugins: {
        'hapi-swagger': {
          responseMessages: [
            {code: 200, message: 'Success'},
            {code: 400, message: 'Bad Request'},
            {code: 404, message: 'Not Found'},
            {code: 500, message: 'Internal Server Error'}
          ]
        }
      }
    }
  })
} 