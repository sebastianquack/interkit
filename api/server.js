let Hapi = require('hapi')
let mongoose = require('mongoose')
let RestHapi = require('rest-hapi')
let Auth = require("./plugins/auth.plugin.js");
const Path = require('path');
const Inert = require('@hapi/inert');

const SocketServer = require('./src/socketServer.js');
const db = require('./src/dbutil.js');

if(process.env.NODE_ENV != "production") {
  require('dotenv-safe').config()  
}

async function api() {
  try {

    let server = Hapi.Server({ 
      port: process.env.PORT,
      routes: {
        files: {
          relativeTo: Path.join(__dirname, 'public')
        }
      }
    })

    await server.register(Inert);

    if(process.env.NODE_ENV == "production") {
      server.ext('onRequest', function (request, h) {
        if(request.headers['x-forwarded-proto'] != 'https') {
          let newUrl = 'https://' + request.headers.host + (request.url.path || request.url.pathname + request.url.search);
          console.log(newUrl);
          return h
            .redirect(newUrl)
            .takeover()
            .code(301)
        }
        else 
          return h.continue; 
      });
    }

    server.route({
        method: 'GET',
        path: '/admin/{param*}',
        handler: {
            directory: {
                path: './admin',
                redirectToSlash: true
            }
        },
        options: {
          auth: false
        }
    });

    server.route({
        method: 'GET',
        path: '/author/{param*}',
        handler: {
            directory: {
                path: './author',
                redirectToSlash: true
            }
        },
        options: {
          auth: false
        }
    });

    server.route({
        method: 'GET',
        path: '/{param*}',
        handler: {
            directory: {
                path: './player',
                redirectToSlash: true
            }
        },
        options: {
          auth: false
        }
    });

    let config = {
      appTitle: "testresthapi",
      version: "1.0.0",
      apiPath: 'custom_endpoints',
      authStrategy: Auth.strategy,
      loglevel: 'WARN',
      mongo: {
        URI: process.env.MONGODB_URI
      }
    };

    await server.register(Auth);
    await server.register({
      plugin: RestHapi,
      options: {
        mongoose,
        config
      },
      routes: {
        prefix: '/api'
      }
    })


    SocketServer.init(server.listener);

    await server.start()
    
    let userModel = RestHapi.models.user;
    const Log = RestHapi.getLogger('seed');
    Log.log('test log level')
    let adminUser = await RestHapi.list(userModel, {$where: {username: "admin"}}, Log)
    //console.log(adminUser);
    if(adminUser.docs.length == 0) {
      Log.log('seeding admin user')
      RestHapi.create(userModel, {username: "admin", password: process.env.ADMIN_PASSWORD}, Log)  
    }

    // seed config entries
    db.seedConfig("fileServerURL", process.env.AWSEndpoint + "/" + process.env.Bucket + "/");
    db.seedConfig("playerURL", "http://localhost:8081");
    db.seedConfig("socketURL", "http://localhost:9000");
    db.seedConfig("defaultProject", "");
    db.seedConfig("googleMapsAPIKey", "");
    db.seedConfig("defaultLat", 10, "number");
    db.seedConfig("defaultLng", 50, "number");
    db.seedConfig("defaultZoom", 15, "number");
    
    console.log("Server ready", server.info)

    return server
  } catch (err) {
    console.log("Error starting server:", err);
  }
}

module.exports = api()