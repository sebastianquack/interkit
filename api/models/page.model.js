let Joi = require('@hapi/joi')
let RestHapi = require('rest-hapi')
let Auth = require("../plugins/auth.plugin.js");
const db = require('../src/dbutil.js');

const marked = require("marked")
const Handlebars = require("handlebars");

Handlebars.registerHelper('ifCond', function(v1, v2, options) {
  if (v1 == v2) {
    return options.fn(this);
  } else {
    return options.inverse(this);
  }
});

async function listWithVars(server, model, options, logger) {
    const Log = logger.bind("getHistory")
    let Boom = require('@hapi/boom')

   const handler = async function (request, h) {

    console.log("key", request.query.key)

    let query = {
      project: request.query.project,
      $sort: "menuOrder"
    }
    if(request.query.key) query.key = request.query.key
  
    let result = await RestHapi.list(RestHapi.models.page, query, Log);

    for(let entry of result.docs) {

      if(entry.format == "markdown") {
        let contentWithVars = await db.embedVars(entry.content, entry.project, request.query.player);  
        entry.contentWithVars = marked(contentWithVars);
      }

      if(entry.format == "handlebars") {
        const template = Handlebars.compile(entry.content);
        let context = {
          player: await db.getVars("player", {player: request.query.player, project: request.query.project}),
          project: await db.getVars("project", {project: request.query.project}),
          items: await db.getItemsForPlayer(request.query.player),
          parameter: request.query.parameter
        }
        console.log("context for handlebars", context)
        try {
          entry.contentWithVars = template(context);
        } catch(e) {
          console.log("handlebars error" , e)
        }

      }
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
          key: Joi.string(),
          parameter: Joi.string(),
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
    key: {
      type: Types.String,
    },
    format: {
      type: Types.String,
      default: "markdown"
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