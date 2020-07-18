let mongoose = require('mongoose')
const RestHapi = require('rest-hapi')
const Moment = require('moment')
const dateFormat = require('dateformat');
const Log = RestHapi.getLogger('socket');

const gameServer = require('./gameServer.js');

Log.logLevel = 'WARNING';


/* CONFIGS */

// seeds config vars if needed
exports.seedConfig = async (key, value, type="text") => {
  let config = await RestHapi.list(RestHapi.models.config, {key: key}, Log);  
  if(config.docs.length == 0) {
    console.log("seeding config ", key, value)
    await RestHapi.create(RestHapi.models.config, {key, value, type}, Log);  
  } else {
    console.log("found config ", config.docs[0].key, config.docs[0].value);
  }
}


/* VARIABLES */

const makeQuery = (scope, refs, key) => {
  let where = {
      key: key,
      varScope: scope,
      project: mongoose.Types.ObjectId(refs.project)
  };
  
  if(refs.player && (scope == "player" || scope == "playerNode"))
    where.player = mongoose.Types.ObjectId(refs.player);
  
  if(refs.node && (scope == "node" || scope == "playerNode")) 
    where.node = mongoose.Types.ObjectId(refs.node);

  if(refs.board && scope == "board") where.board = mongoose.Types.ObjectId(refs.board);
  
  return where;
}

const checkRefs = (scope, refs) => {
  return scope == "player" && refs.player && refs.project
          || scope == "board" && refs.board && refs.project
          || scope == "node" && refs.node && refs.project
          || scope == "playerNode" && refs.node && refs.player && refs.project
          || scope == "project" && refs.project
}

exports.setVar = async (scope, refs, key, value) => {
  console.log("setVar", scope, refs, key, value);

  if(checkRefs(scope, refs)) {

    let where = makeQuery(scope, refs, key);

    // try to find variable
    let variable = await RestHapi.list(RestHapi.models.variable, {$where: where}, Log);

    if(typeof value == "string") where.varType = "string"
    if(typeof value == "number") where.varType = "number"
    if(typeof value == "object") where.varType = "object"
    where.stringValue = null // overwrite pretty string presentation from manual editing in authoring

    // create
    if(variable.docs.length == 0) {
      await RestHapi.create(RestHapi.models.variable, {...where, value}, Log);  
    // update
    } else {
      await RestHapi.update(RestHapi.models.variable, variable.docs[0]._id, {
        value: value, stringValue: null 
      }, Log);  
    }
  } else {
    console.log("setVar got wrong refs", scope, refs)
  }
}

exports.getVars = async (scope, refs) => {
  if(checkRefs(scope, refs)) {
    let where = makeQuery(scope, refs, undefined);
    delete where.key;
    let variables = await RestHapi.list(RestHapi.models.variable, {$where: where}, Log);

    let varObj = {};
    if(variables.docs.length)
      variables.docs.forEach((v)=>{
        varObj[v.key] = v.value;
      })
    return varObj;
  } else {
    console.log("getVars got wrong refs", scope, refs)
  }
}

exports.getVar = async (scope, refs, key) => {
  console.log("getVar", scope, refs, key);

  if(checkRefs(scope, refs)) {

    let where = makeQuery(scope, refs, key);

    // try to find variable
    let variable = await RestHapi.list(RestHapi.models.variable, {$where: where}, Log);

    if(variable.docs.length == 1) {
      return variable.docs[0].value;
    } else {
      return undefined;
    }
  } else {
    console.log("getVar got wrong refs", scope, refs)
  }
}

exports.embedVars = async (content, projectId, playerId=null) => {

  const replaceVars = async (regex, content, scope, refs) => {

    while ((m = regex.exec(content)) !== null) {
      console.log("found project var ", m[1]);
      console.log("string to replace", m[0]);
      let value = await exports.getVar(scope, refs, m[1])
      console.log("value", value);
      if(!value) value = "[var "+m[1]+" not found]";
      content = content.replace(m[0], value);
    } 

    return content;
  }
  
  let regexProjectVars = /(?:\{project\.)(.+?)(?:\})/g    
  content = await replaceVars(regexProjectVars, content, "project", {project: projectId});

  let regexPlayerVars = /(?:\{player\.)(.+?)(?:\})/g    
  content = await replaceVars(regexPlayerVars, content, "player", {player: playerId, project: projectId});

  return content;
}

// updates the persistent player interface variable that is loaded on player reload
exports.persistPlayerInterface = async (projectId, playerId, key, options) => {

  let playerInterface = await exports.getVar("player", {project: projectId, player: playerId}, "interfaceState");

  if(!playerInterface) {
    playerInterface = {}  
  }

  playerInterface = {...playerInterface, ...options};
  
  await exports.setVar("player", {project: projectId, player: playerId}, "interfaceState", playerInterface)
}



/* HELPERS MODIFYING PLAYER OBJECTS */

exports.setPlayerAttribute = async (playerId, attribute, value) => {
  let player = await RestHapi.find(RestHapi.models.player, playerId, null, Log);
  let query = {};
  query[attribute] = value;
  await RestHapi.update(RestHapi.models.player, playerId, query, Log);
}

exports.getPlayerAttribute = async (playerId, attribute) => {
  let player = await RestHapi.find(RestHapi.models.player, playerId, null, Log);
  return player[attribute];
}




/* HELPERS PROJECTS, BOARDS, NODES */


exports.getProjectForNode = async (node) => {
  let board = await exports.getBoard(node.board);
  let project = await RestHapi.find(RestHapi.models.project, board.project, null, Log);
  return project;
}

exports.getBoard = async (boardId) => {
  let board = await RestHapi.find(RestHapi.models.board, boardId, null, Log);
  return board;
}

exports.listBoardForPlayer = async (playerId, boardKey, projectId, listed=true) => {

  let boards = await RestHapi.list(RestHapi.models.board, {
    key: boardKey,
    project: projectId
  }, Log)

  if(boards.docs.length == 1) {

    let board = boards.docs[0];

    let boardLog = await RestHapi.list(RestHapi.models.boardLog, {
      player: playerId,
      board: board._id,
      project: projectId
    }, Log)

    if(boardLog.docs.length == 1) {
      await RestHapi.update(RestHapi.models.boardLog, boardLog.docs[0]._id, {listed}, Log)
    } else {
      await RestHapi.create(RestHapi.models.boardLog, {
        player: playerId,
        board: board._id,
        project: projectId,
        listed
      }, Log);
    }

  } else {
    console.log("couldn't find board to log to player")
  }

}



/* PLAYER MOVEMENT, NODELOGS */

// retrieves the current node for a given player and board
exports.getCurrentNodeId = async (playerId, boardId) => {
  console.log("getCurrentNodeId", playerId, boardId);
  
  // retrieve current node
  let nodeLogHistory = await RestHapi.list(RestHapi.models.nodeLog, {
    player: mongoose.Types.ObjectId(playerId),  
    board: mongoose.Types.ObjectId(boardId),
    $sort: {timestamp: -1},
    $limit: 1,
    $where: {
      timestamp: {$lt: Date.now()},
      scheduled: {$ne: true},
    }
  }, Log);

  //console.log("nodeLogHistory", nodeLogHistory)

  if(nodeLogHistory.docs.length) {
    return nodeLogHistory.docs[0].node
  } else {
    return null;
  }
}

// creates a new nodelog and return the name of the current (now previous node)
exports.logPlayerToNode = async (playerId, node) => {
  console.log("logPlayerToNode", playerId, node._id);

  let prevNodeId = await exports.getCurrentNodeId(playerId, node.board)
  let prevNode = null;
  if(prevNodeId) {
    prevNode = await RestHapi.find(RestHapi.models.scriptNode, prevNodeId, null, Log);
  }
    
  // create a new nodeLog
  await RestHapi.create(RestHapi.models.nodeLog, {
    player: mongoose.Types.ObjectId(playerId),
    board: mongoose.Types.ObjectId(node.board),
    project: mongoose.Types.ObjectId(node.project),
    node: mongoose.Types.ObjectId(node._id),
    timestamp: Date.now(),
    scheduled: false
  }, Log);       

  if(prevNode)
    return prevNode.name;
}

// retrieves players currently logged to a node
exports.getPlayersForNode = async (nodeId) => {
  console.log("getPlayersForNode", nodeId)

  // lode the node
  let node = await RestHapi.find(RestHapi.models.scriptNode, nodeId, null, Log);

  // get all players that have visited this node
  let query = {
    node: mongoose.Types.ObjectId(nodeId),  
    timestamp: {$lt: Date.now()},
    scheduled: {$ne: true}
  }
  let playerIds = await RestHapi.models.nodeLog.distinct("player", query);
  console.log("playerIds", playerIds);

  // take only the ones that are currently here
  let result = []
  for(let playerId of playerIds) {
    let currentNodeId = await exports.getCurrentNodeId(playerId, node.board)
    //console.log("compare", currentNodeId, nodeId)
    if(currentNodeId.toString() == nodeId.toString()) 
      result.push(playerId)
  }

  console.log("result", result)

  return result;
}

// creates a nodelog for a move scheduled in the future
exports.scheduleMoveTo = async (playerId, node, timeFromNowObj) => {
  //console.log("scheduleMoveTo", node)

  let query = {
    player: mongoose.Types.ObjectId(playerId),
    board: mongoose.Types.ObjectId(node.board),
    project: mongoose.Types.ObjectId(node.project),
    node: mongoose.Types.ObjectId(node._id),
    timestamp: Moment().add(timeFromNowObj).valueOf(),
    scheduled: true,
    moveTime: Moment().add(timeFromNowObj).valueOf()
  }

  await RestHapi.create(RestHapi.models.nodeLog, query, Log);         
}

// pass in nodeLogModel and log so we are able to call this from outside of server application through helper script
exports.executeScheduledMoves = async (nodeLogModel, log) => {
  //console.log("executeScheduledMoves");
  let nodeLogs = await RestHapi.list(nodeLogModel, {$where: {scheduled: true }}, log)
  
  if(nodeLogs.docs.length) {
    for(let i = 0; i < nodeLogs.docs.length; i++) {
      let nodeLog = nodeLogs.docs[i];
      if(nodeLog.moveTime <= Date.now()) {
        // execute moveto
        await exports.setPlayerAttribute(nodeLog.player, "moveCounter", 0) // reset move counter
        await gameServer.joinNode({
          nodeId: nodeLog.node, 
          playerId: nodeLog.player, 
          execOnArrive: true
        })
        // mark as done
        await RestHapi.update(nodeLogModel, nodeLog._id, {scheduled: false}, log)
      } else {
        console.log("scheduled move found to node " + nodeLog.node + " in " + ((nodeLog.moveTime - Date.now()) / 1000) + "s");
      }
    };
  } else {
    //console.log("nothing to do");
  } 
}




/* MESSAGES */

exports.logMessage = async (data) => {
  //console.log("logMessage", data);
  let message = await RestHapi.create(RestHapi.models.message, data, Log);  
  return message;
}

// uses moment add, ie moment().add({days:7,months:1}); // with object literal

exports.scheduleMessage = (timeFromNowObj, data) => {
  let message = {
    ...data,
    scheduled: true,
    deliveryTime: Moment().add(timeFromNowObj).valueOf()
  }
  exports.logMessage(message);  
}

// pass in messageModel and log so we are able to call it from outside of server application through helper script
exports.deliverScheduledMessages = async (messageModel, log) => {
  //console.log("deliverScheduledMessages");
  let messages = await RestHapi.list(messageModel, {$where: {scheduled: true }}, log)
  let deliveredMesssages = [];
  if(messages.docs.length) {
    for(let i = 0; i < messages.docs.length; i++) {
      let m = messages.docs[i];
      if(m.deliveryTime <= Date.now()) {
        console.log("delivering: ", m);
        let result = await RestHapi.update(messageModel, m._id, {
          scheduled: false,
          timestamp: Date.now(),
        }, log)
        console.log(result);
        deliveredMesssages.push(result);

        // not sure we should move on scheduled message!
        let node = await RestHapi.find(RestHapi.models.scriptNode, m.node, null, Log);
        exports.logPlayerToNode(m.recipients[0], node);
      } else {
        console.log("found a scheduled message but not yet time to deliver");
      }
    };
  } else {
    //console.log("no messages scheduled");
  }
  return deliveredMesssages;
}

// helper for location message type
exports.createLocationThumbnail = async (coords) => {

  let googleMapsAPIKey = await RestHapi.list(RestHapi.models.config, {key: "googleMapsAPIKey"}, Log);
  console.log(googleMapsAPIKey)

  if(googleMapsAPIKey.docs)
    return mapImgUrl = 
          "https://maps.googleapis.com/maps/api/staticmap?center="
          +coords.latitude+","+coords.longitude
          +"&zoom=18&size=150x150"
          //+"&markers=size:small%7Ccolor:black%7C"+position.coords.latitude+","+position.coords.longitude
          +"&key="+googleMapsAPIKey.docs[0].value
          +"&style=element:geometry%7Ccolor:0xf5f5f5&style=element:labels.icon%7Cvisibility:off&style=element:labels.text.fill%7Ccolor:0x616161&style=element:labels.text.stroke%7Ccolor:0xf5f5f5&style=feature:administrative.land_parcel%7Celement:labels.text.fill%7Ccolor:0xbdbdbd&style=feature:poi%7Celement:geometry%7Ccolor:0xeeeeee&style=feature:poi%7Celement:labels.text.fill%7Ccolor:0x757575&style=feature:poi.park%7Celement:geometry%7Ccolor:0xe5e5e5&style=feature:poi.park%7Celement:labels.text.fill%7Ccolor:0x9e9e9e&style=feature:road%7Celement:geometry%7Ccolor:0xffffff&style=feature:road.arterial%7Celement:labels.text.fill%7Ccolor:0x757575&style=feature:road.highway%7Celement:geometry%7Ccolor:0xdadada&style=feature:road.highway%7Celement:labels.text.fill%7Ccolor:0x616161&style=feature:road.local%7Celement:labels.text.fill%7Ccolor:0x9e9e9e&style=feature:transit.line%7Celement:geometry%7Ccolor:0xe5e5e5&style=feature:transit.station%7Celement:geometry%7Ccolor:0xeeeeee&style=feature:water%7Celement:geometry%7Ccolor:0xc9c9c9&style=feature:water%7Celement:labels.text.fill%7Ccolor:0x9e9e9e&";
}





/* ITEMS */

// creates or update an item
exports.createOrUpdateItem = async (payload, projectId) => {
  let items = await RestHapi.list(RestHapi.models.item, {key: payload.key, project: projectId}, Log)
  delete payload._id; // remove key to prevent collisions when copying items
  if(items.docs.length == 0) {
    console.log("creating item with", payload, projectId);
    let item = await RestHapi.create(RestHapi.models.item, {...payload, project: projectId}, Log);  
  }
  else if(items.docs.length == 1) {
    console.log("updating item with", payload, projectId);
    await RestHapi.update(RestHapi.models.item, items.docs[0]._id, {...payload, project: projectId}, Log);
  }
}

// award item to a player
exports.awardItemToPlayer = async (playerId, projectId, key, to = "one") => {
  let items = await RestHapi.list(RestHapi.models.item, {key: key, project: projectId}, Log)
  let item = items.docs[0];
  
  if(items.docs.length == 1) {
    
    if(to == "one") {
  
      await RestHapi.addOne(
        RestHapi.models.player,
        playerId,
        RestHapi.models.item,
        item._id,
        "items",
        {},
        Log
      )
      console.log("awardItemToPlayer - success")
    
    }

    if(to == "all") {
      console.log("awarding item to all players in project...")
      let projectLogs = await RestHapi.list(RestHapi.models.projectLog, {project: projectId}, Log); 
      let playerIds = projectLogs.docs.map(d=>d.player);
      console.log("found players", playerIds);
      await RestHapi.addMany(
        RestHapi.models.item,
        item._id,
        RestHapi.models.player,
        "players",
        playerIds,
        Log
      )
    }

    return item;

  } else {
      console.log("awardItemToPlayer - item not found")
  }
}

// remove item from a player
exports.removeItemFromPlayer = async (playerId, projectId, key) => {
  console.log("removeItemFromPlayer", key);
  let items = await RestHapi.list(RestHapi.models.item, {key: key, project: projectId}, Log)
  if(items.docs.length == 1) {
    let item = items.docs[0];
    await RestHapi.removeOne(
      RestHapi.models.player,
      playerId,
      RestHapi.models.item,
      item._id,
      "items",
      {},
      Log
    )
    console.log("removeItemFromPlayer - success")
  } else {
    console.log("removeItemFromPlayer - item not found")
  }
}

// retrieve one item
exports.getItem = async (key, project) => {
  let item = await RestHapi.list(RestHapi.models.item, {key, project}, Log);
  console.log(item);
  if(item.docs.length > 0) return item.docs[0]
  return null;
}

// retrieves a players items
exports.getItemsForPlayer = async (playerId) => {
  let items = await RestHapi.getAll(RestHapi.models.player, playerId, RestHapi.models.item, "items", {}, Log);
  console.log("retrieved items for player", playerId, items.docs);
  return items.docs;
}

exports.getItemsQuery = async (project, query) => {

  // tip: mongo query to search inside nested document
  // { 'value.latIndex': 1000 } 

  let items = await RestHapi.list(RestHapi.models.item, {...query, project}, Log);
  console.log("retrieved items for player", playerId, items.docs);
  return items.docs;

}


/* FILES / ATTACHMENTS */

exports.getAttachmentFilename = async (keyOrName, projectId) => {
  let query = {
    $or: [ { key: keyOrName }, { name: keyOrName, authored: true } ],
  }
  if (projectId) {
    query = {
      ...query,
      project: projectId
    }
  }
  const attachments = await mongoose.model("file").find(query)
  if (attachments.length === 0) { console.warn(`attachment "${keyOrName}" not found`); return ""; }
  if (attachments.length === 1) { return attachments[0].filename; }
  if (attachments.length > 1)   { console.warn(`several attachments found for "${keyOrName}"`, attachments); return attachments[0].filename; }
}


/* IMPORT / EXPORT */


// get project and all it's associated documents
exports.getAllOfProject = async function (projectId, includeUserContent=false) {
  const Project = mongoose.model("project");
  const Board = mongoose.model("board");
  const ScriptNode = mongoose.model("scriptNode");
  const Item = mongoose.model("item");
  const Page = mongoose.model("page");
  const Variable = mongoose.model("variable");

  // get data, use lean() to get a plain array rather than mongoose objects
  const project = await Project.findOne({_id: projectId}).lean()
  const boards = await Board.find({project: projectId}).lean()
  const scriptNodes = await ScriptNode.find({board: { $in: boards.map(b=>b._id) } }).lean()
  const items = await Item.find({project: projectId, authored: true}).lean()
  const pages = await ( includeUserContent ? Page.find({project: projectId}).lean() : Page.find({project: projectId, authored: true}).lean() );
  const variables = await Variable.find({project: projectId, varScope: "project"}).lean() // for now get only project variables

  return {
    project,
    boards,
    scriptNodes,
    items,
    pages,
    variables,
    // TODO attachments
  }  
}

// rewrite all _ids, also in (internal) references. this methods relies on the uniqueness of mongoose objectIds
const duplicateProjectData = function (projectData, newProjectName) {
  let {
    project,
    boards,
    scriptNodes,
    items,
    pages,
    variables,
    // TODO attachments
  } = projectData

  // helper function [ { _id: 1 }, { _id: 2 } ] => { '1': 3, '2': 4 }
  const generateIdMappings = obj => obj
    .map(i => ({[i._id]: mongoose.Types.ObjectId() }))
    .reduce(((r, c) => Object.assign(r, c)), {})

  // create a pool of objectIds mappings old -> new
  const _idMappings = {
    ...generateIdMappings([project]),
    ...generateIdMappings(boards),
    ...generateIdMappings(scriptNodes),
    ...generateIdMappings(items),
    ...generateIdMappings(pages),
    ...generateIdMappings(variables),
  }
  
  // function to translate a key according to mappings
  const translateKeys = (objects, key) =>
    objects.map(obj => ({...obj, [key]: _idMappings[obj[key]] }))

  // BEGIN DO translations -> mutate data

  // translate project
  project = translateKeys([project], "_id")[0]
  project.name = newProjectName || `${project.name} (duplicated ${dateFormat(new Date(), "yyyy-mm-dd-HH-MM-ss")})`

  // translate boards
  boards = translateKeys(boards, "_id")
  boards = translateKeys(boards, "project")
  boards = translateKeys(boards, "startingNode")
  //boards = boards.map(b => ({...b, name: parseInt(1000*Math.random())}))

  // translate scriptNodes
  scriptNodes = translateKeys(scriptNodes, "_id")
  scriptNodes = translateKeys(scriptNodes, "board")
  scriptNodes = scriptNodes.map(s => ({
    ...s,
    connectionIds: (s.connectionIds || []).map(_id => _idMappings[_id])
  }))  

  // translate items
  items = translateKeys(items, "_id")
  items = translateKeys(items, "project")

  // translate pages
  pages = translateKeys(pages, "_id")
  pages = translateKeys(pages, "project")

  variables = translateKeys(variables, "_id")
  variables = translateKeys(variables, "project")

  // END translations -> mutation complete

  const result = {
    project,
    boards,
    scriptNodes,
    items,
    pages,
    variables,
  }

  //console.log("result", result)

  return result

}

exports.insertProjectAsDuplicate = async (projectData, newProjectName) => {

  //console.log("original", projectData)
  //console.log("duplicate", await duplicateProjectData(projectData, newProjectName))

  const {
    project,
    boards,
    scriptNodes,
    items,
    pages,
    variables,
    // TODO attachments
  } = duplicateProjectData(projectData, newProjectName)

  const Project = mongoose.model("project");
  const Board = mongoose.model("board");
  const ScriptNode = mongoose.model("scriptNode");
  const Item = mongoose.model("item");
  const Page = mongoose.model("page");
  const Variable = mongoose.model("variable");

  const errorReport = function(error, docs) { console.log(error, docs)}

  await Project.insertMany([project], errorReport);
  await Board.insertMany(boards, errorReport, {ordered: false});
  await ScriptNode.insertMany(scriptNodes, errorReport);
  await Item.insertMany(items, errorReport);
  await Page.insertMany(pages, errorReport);
  await Variable.insertMany(variables, errorReport);

  return project.name // new name
}

exports.duplicateProject = async function (projectId) {
  const projectData = await exports.getAllOfProject(projectId)
  return await exports.insertProjectAsDuplicate(projectData)
}

