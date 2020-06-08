let Joi = require('@hapi/joi')
let RestHapi = require('rest-hapi')
let Auth = require("../plugins/auth.plugin.js");
const db = require('../src/dbutil.js');


function listWithVars(server, model, options, logger) {
    const Log = logger.bind("getHistory")
    let Boom = require('@hapi/boom')

   const handler = async function (request, h) {
        
    let result = await RestHapi.list(RestHapi.models.page, {project: request.query.project}, Log);

    for(let entry of result.docs) {
      entry.contentWithVars = await db.embedVars(entry.content, entry.project, request.query.player);  
    }

    if (result) {
      return h.response(result).code(200)
    }
    else {
      throw Boom.notFound("error loading pages with vars")
    }

    return result;
  }


  server.route({
    method: 'GET',
    path: '/page/listWithVars',
    config: {
      handler: handler,
      auth: false,
      description: 'get list of pages with embedded vars',
      tags: ['api'],
      validate: {
        query: {
          project: Joi.string().required(),
          player: Joi.string(),
        },
      },
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
      associations: {
        project: {
          type: "MANY_ONE",
          model: "project"
        },
      },
      extraEndpoints: [
        listWithVars
      ]
    }
  };
  
  return Schema;
};