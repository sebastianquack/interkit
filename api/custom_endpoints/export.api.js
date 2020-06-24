let Auth = require("../plugins/auth.plugin.js");

const downloadTokens = new Set();
const hostname = require('os').hostname()

const getProjectData = async (projectId) => {
  //let project = await RestHapi.findOne(projectId);
  //let boards = await RestHapi.find(RestHapi.models.board, projectId, null, Log);
  
//  - alle boards darin
//- alle scriptNodes darin
//- alle items des projects
//- alle pages des proejcts
  return project;
}

const getBoardData = async (boardId) => {



  return {
  };
}

const downloadToken = async (request, mongoose, logger) => {
  const crypto = require('crypto')
  const downloadToken = crypto.createHash('sha1').update(Math.random().toString()).digest('hex');
  downloadTokens.add(downloadToken)
  return {downloadToken, hostname}
}

const exportData = async (request, mongoose, logger) => {

  const Boom = require("@hapi/boom");

  if (!request.query.downloadToken || !downloadTokens.has(request.query.downloadToken)) {
    throw Boom.unauthorized("wrong or missing downloadToken.");
  }

  downloadTokens.delete(downloadToken)

  const Project = mongoose.model("project");
  const Board = mongoose.model("board");
  const ScriptNode = mongoose.model("scriptNode");
  const Item = mongoose.model("item");
  const Page = mongoose.model("page");

  if (request.query.projectId) {
    const projectId = request.query.projectId
    // console.log("exportData: exporting project", projectId);

    const project = await Project.findOne({_id: projectId})
    const boards = await Board.find({project: projectId});
    const scriptNodes = await ScriptNode.find({board: { $in: boards.map(b=>b._id) } });
    const items = await Item.find({project: projectId});
    const pages = await Page.find({project: projectId});

    const out = {
      project,
      boards,
      scriptNodes,
      items,
      pages,
    }

    // console.log(out)

    return {
      projectName: project.name,
      timestamp:Date.now(),
      request: request.query,
      hostname,
      success:true, 
      data: out
    }

  } else {
    error = "unknown project id"
    return {success:false, error }
  }
  
  
}

module.exports = function (server, mongoose, logger) {

    server.route({
      method: 'GET',
      path: '/downloadToken',
      config: {
        handler: request => downloadToken(request, mongoose, logger),
        auth: Auth.strategy,
        tags: ['api'],
        plugins: {
          'hapi-swagger': {}
        }
      }
    })

    server.route({
      method: 'GET',
      path: '/export',
      config: {
        handler: request => exportData(request, mongoose, logger),
        auth: false,
        tags: ['api'],
        plugins: {
          'hapi-swagger': {}
        }
      }
    })

}