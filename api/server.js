let Hapi = require('@hapi/hapi')
let mongoose = require('mongoose')
let RestHapi = require('rest-hapi')
let Auth = require("./plugins/auth.plugin.js");
const Path = require('path');
const Inert = require('@hapi/inert');

const gameServer = require('./src/gameServer.js');
const db = require('./src/dbutil.js');

console.log("  NODE_ENV: " + process.env.NODE_ENV)

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
          path: '/shared_public/{param*}',
          handler: {
              directory: {
                  path: './shared_public',
                  redirectToSlash: true
              }
          },
          options: {
            auth: false
          }
      });

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
        path: '/tmp/{param*}',
        handler: {
            directory: {
                path: './tmp',
                redirectToSlash: true
            }
        },
        options: {
          auth: false
        }
    });

  
    // for ios PWA, we need to save projectId and playerId in the url
    server.route({
        method: 'GET',
        path: '/project/{project}/player/{player}/{param*}',
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

    server.route({
        method: 'GET',
        path: '/project/{project}/{param*}',
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
      enableWhereQueries: true, // TODO remove for production!
      apiPath: 'custom_endpoints',
      authStrategy: Auth.strategy,
      loglevel: 'WARN',
      mongo: {
        URI: process.env.MONGODB_URI
      } 
    };

    console.log("  Mongo URI: " + config.mongo.URI)

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


    gameServer.init(server.listener);

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

    // remove leftover "name" index on boards, because it throws when inserting duplicated boards with different _id but same name
    const boardCollection = mongoose.model("board").collection
    try {
      await boardCollection.dropIndex( "name_1" );
    } catch(e) {}

    // remove leftover "key" index on files, because it throws when inserting duplicated file with different _id but same key
    const fileCollection = mongoose.model("file").collection
    try {
      await fileCollection.dropIndex( "key_1" );
    } catch(e) {}    

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