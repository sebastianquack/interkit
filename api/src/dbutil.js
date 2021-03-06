const mongoose = require('mongoose')
const RestHapi = require('rest-hapi')
const Moment = require('moment')
const dateFormat = require('dateformat');
const Log = RestHapi.getLogger('socket');

const gameServer = require('./gameServer.js');
const {s3copy} = require('./s3')
const {generateFilename} = require('../../shared/common')

const Diff = require('diff');
const deepEqual = require('deep-equal');

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

exports.getConfig = async(key) => {
  let config = await RestHapi.list(RestHapi.models.config, {key: key}, Log);  
  if(config.docs.length == 1) {
    return config.docs[0].value;
  } else {
    console.log("config not found", key)
    return null
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

  if(refs.board && scope == "board") 
    where.board = mongoose.Types.ObjectId(refs.board);
  
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
  //console.log("setVar", scope, refs, key, value);

  if(checkRefs(scope, refs)) {

    let where = makeQuery(scope, refs, key);

    // try to find variable
    let variable = await RestHapi.list(RestHapi.models.variable, {$where: where}, Log);

    //console.log("list vars", variable)

    if(typeof value == "string") where.varType = "string"
    if(typeof value == "number") where.varType = "number"
    if(typeof value == "object") where.varType = "object"
    where.stringValue = null // overwrite pretty string presentation from manual editing in authoring

    // create
    if(variable.docs.length == 0) {
      await RestHapi.create(RestHapi.models.variable, {...where, value}, Log);  
    // update
    } else {

      if(variable.docs.length > 1) {
        console.log("warning: multiple version of var ", key)
      }

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
  //console.log("getVar", scope, refs, key);

  if(checkRefs(scope, refs)) {

    let where = makeQuery(scope, refs, key);

    //console.log(where)

    // try to find variable
    let variable = await RestHapi.list(RestHapi.models.variable, {$where: where}, Log);

    if(variable.docs.length == 1) {

      if(variable.docs.length > 1) {
        console.log("warning: multiple version of var ", key)
      }

      return variable.docs[0].value;
    } else {
      return undefined;
    }
  } else {
    console.log("getVar got wrong refs", scope, refs)
  }
}

exports.findVars = async (query) => {
  const result = await mongoose.model("variable").find(query)
  return result
}

exports.embedVars = async (content, projectId, playerId=null) => {

  const replaceVars = async (regex, content, scope, refs) => {

    while ((m = regex.exec(content)) !== null) {
      //console.log("found project var ", m[1]);
      //console.log("string to replace", m[0]);
      let value = await exports.getVar(scope, refs, m[1])
      //console.log("value", value);
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
exports.persistPlayerInterface = async (projectId, playerId, key, options, boardId) => {

  let playerInterface = await exports.getVar("player", {project: projectId, player: playerId}, "interfaceState");

  if(!playerInterface) {
    playerInterface = {}  
  }

  if(key == "inputs") {
    // initialise inputs if not set yet
    if(!playerInterface.inputs) {
      playerInterface.inputs = {}
    }  
    playerInterface.inputs[boardId] = {...options}
    options = {};
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

// subscribe a player to a notification channel on a board
exports.boardSubscribe = async (playerId, boardId, channelKey) => {
  const BoardLog = mongoose.model("boardLog");
  let boardLogs = await BoardLog.find({
    player: mongoose.Types.ObjectId(playerId), 
    board: mongoose.Types.ObjectId(boardId)
  })
  if(boardLogs.length) {
    let boardLog = boardLogs[0];
    let subscribedChannels = boardLog.subscribedChannels;
    if(!subscribedChannels) {
      subscribedChannels = [channelKey]
    } else {
      if(subscribedChannels.indexOf(channelKey) == -1) {
        subscribedChannels.push(channelKey)
      }
    }
    let bl = await BoardLog.update({_id: boardLog._id}, {subscribedChannels})
  }
}

// unsubscribe from a notification channel on a board        
exports.boardUnsubscribe = async (playerId, boardId, channelKey) => {
  const BoardLog = mongoose.model("boardLog");
  let boardLogs = await BoardLog.find({
    player: mongoose.Types.ObjectId(playerId), 
    board: mongoose.Types.ObjectId(boardId)
  })
  if(boardLogs.length) {
    let boardLog = boardLogs[0];

    let subscribedChannels = boardLog.subscribedChannels;
    if(subscribedChannels) {
      let index = subscribedChannels.indexOf(channelKey)
      if(index != -1) {
        subscribedChannels.splice(index, 1)
        await BoardLog.update({_id: boardLog._id}, {subscribedChannels})
      }
    }
  }
}


/* PLAYER MOVEMENT, NODELOGS */

// retrieves the current node for a given player and board
exports.getCurrentNodeId = async (playerId, boardId) => {
  //console.log("getCurrentNodeId", playerId, boardId);
  
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
  console.log("logPlayerToNode " + playerId + " @" + node.name);

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

  // update boardLog
  const BoardLog = mongoose.model("boardLog");
  let boardLogs = await BoardLog.find({
    player: mongoose.Types.ObjectId(playerId), 
    board: mongoose.Types.ObjectId(node.board)
  })
  if(boardLogs.length) {
    let boardLog = boardLogs[0];
    await BoardLog.update({_id: boardLog._id}, {currentNode: node._id})
  }

  if(prevNode)
    return prevNode.name;
}

// retrieves players currently logged to a node
exports.getPlayersForNode = async (nodeId) => {
  //console.log("getPlayersForNode", nodeId)

  // lode the node
  let node = await RestHapi.find(RestHapi.models.scriptNode, nodeId, null, Log);

  // get all players that have visited this node
  let query = {
    node: mongoose.Types.ObjectId(nodeId),  
    timestamp: {$lt: Date.now()},
    scheduled: {$ne: true}
  }
  let playerIds = await RestHapi.models.nodeLog.distinct("player", query);
  //console.log("playerIds", playerIds);

  // take only the ones that are currently here
  let result = []
  for(let playerId of playerIds) {
    let currentNodeId = await exports.getCurrentNodeId(playerId, node.board)
    //console.log("compare", currentNodeId, nodeId)
    if(currentNodeId.toString() == nodeId.toString()) 
      result.push(playerId)
  }

  //console.log("result", result)

  return result;
}

exports.getConnectedNodeIds = async (node) => {

  let connectedNodeNames = [];
  let connectedNodeIds = [];

  let regex1 = /(?:moveTo\(\")(.+)(?:\")/g    
  while ((array1 = regex1.exec(node.script)) !== null) {
    connectedNodeNames.push(array1[1]);
  } 
  console.log("found connections: ", connectedNodeNames);

  for(let i = 0; i < connectedNodeNames.length; i++) {
    let n = await RestHapi.list(RestHapi.models.scriptNode, {
      name: connectedNodeNames[i],
      board: node.board
    }, Log);
    if(n.docs.length == 1) {
      connectedNodeIds.push(n.docs[0]._id);
    }
  }
  console.log("found ids:", connectedNodeIds);

  return connectedNodeIds;
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
  let scheduledCounter = 0
  let moveCounter = 0
  
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
        moveCounter += 1;
      } else {
        scheduledCounter += 1;
      }
    }
    //console.log("scheduled move found for player " + nodeLog.player + " to node " + nodeLog.node + " in " + ((nodeLog.moveTime - Date.now()) / 1000) + "s");
    if(moveCounter) {
      console.log("executeScheduledMoves " + moveCounter + " (remaining: " + scheduledCounter + ")")
    }

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
  let scheduledCounter = 0;
  if(messages.docs.length) {
    for(let i = 0; i < messages.docs.length; i++) {
      let m = messages.docs[i];
      if(m.deliveryTime <= Date.now()) {
        //console.log("delivering: ", m);
        let result = await RestHapi.update(messageModel, m._id, {
          scheduled: false,
          timestamp: Date.now(),
        }, log)
        //console.log(result);
        deliveredMesssages.push(result);

        // not sure we should move on scheduled message!
        if(m.params) {
          if(m.params.moveOnReceive) {
            let node = await RestHapi.find(RestHapi.models.scriptNode, m.node, null, Log);
            exports.logPlayerToNode(m.recipients[0], node);
          }
        }
      } else {
        scheduledCounter++;
      }
    }
    if(deliveredMesssages.length)
      console.log("deliverScheduledMessages: " + deliveredMesssages.length + " (remaining: " + scheduledCounter + ")");

  } else {
    //console.log("no messages scheduled");
  }
  return deliveredMesssages;
}

// helper for location message type
exports.createLocationThumbnail = async (coords) => {

  let googleMapsAPIKey = await RestHapi.list(RestHapi.models.config, {key: "googleMapsAPIKey"}, Log);
  //console.log(googleMapsAPIKey)

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
  if(!payload.authored) {
    payload.authored = false;
  }
  let items = await RestHapi.list(RestHapi.models.item, {key: payload.key, project: projectId}, Log)
  delete payload._id; // remove key to prevent collisions when copying items
  if(items.docs.length == 0) {
    console.log("creating item with key " + payload.key);
    let item = await RestHapi.create(RestHapi.models.item, {...payload, project: projectId}, Log);  
  }
  else if(items.docs.length == 1) {
    console.log("updating item with with key " + payload.key);
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
      let projectLogs = await RestHapi.list(RestHapi.models.projectLog, {project: projectId}, Log); 
      let playerIds = projectLogs.docs.map(d=>d.player);
      console.log("awarding item " + item.key + " to all " + playerIds.length + " players in project")
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
      console.log("awardItemToPlayer - item " + key + " not found")
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
    console.log("removeItemFromPlayer - item " + key + " not found")
  }
}

// retrieve one item
exports.getItem = async (key, project) => {
  let item = await RestHapi.list(RestHapi.models.item, {key, project}, Log);
  //console.log(item);
  if(item.docs.length > 0) return item.docs[0]
  return null;
}

// retrieves a players items
exports.getItemsForPlayer = async (playerId, query = {}) => {
  let items = await RestHapi.getAll(RestHapi.models.player, playerId, RestHapi.models.item, "items", query, Log);
  //console.log("retrieved items for player", playerId, items.docs);
  return items.docs;
}

exports.getItemsQuery = async (project, query) => {

  // tip: mongo query to search inside nested document
  // { 'value.latIndex': 1000 } 

  let items = await RestHapi.list(RestHapi.models.item, {...query, project}, Log);
  //console.log("retrieved items for player", playerId, items.docs);
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
  if (attachments.length > 1)   { console.warn(`warning: several attachments found for "${keyOrName}"`); return attachments[0].filename; }
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
  const File = mongoose.model("file");  

  // get data, use lean() to get a plain array rather than mongoose objects
  const project = await Project.findOne({_id: projectId}).lean()
  const boards = await Board.find({project: projectId}).lean()
  const scriptNodes = await ScriptNode.find({board: { $in: boards.map(b=>b._id) } }).lean()
  const items = await ( includeUserContent ? Item.find({project: projectId}).lean() : Item.find({project: projectId, authored: true}).lean() );
  const pages = await Page.find({project: projectId}).lean()
  const files = await ( includeUserContent ? File.find({project: projectId}).lean() : File.find({project: projectId, authored: true}).lean() );  
  const variables = await Variable.find({project: projectId, varScope: "project"}).lean() // for now get only project variables

  return {
    project,
    boards,
    scriptNodes,
    items,
    pages,
    variables,
    files
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
    files
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
    ...generateIdMappings(files),    
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

  // translate variables
  variables = translateKeys(variables, "_id")
  variables = translateKeys(variables, "project")

  // translate files
  files = translateKeys(files, "_id")
  files = translateKeys(files, "project")  

  // END translations -> mutation complete

  const result = {
    project,
    boards,
    scriptNodes,
    items,
    pages,
    variables,
    files
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
    files
  } = duplicateProjectData(projectData, newProjectName)

  const Project = mongoose.model("project");
  const Board = mongoose.model("board");
  const ScriptNode = mongoose.model("scriptNode");
  const Item = mongoose.model("item");
  const Page = mongoose.model("page");
  const Variable = mongoose.model("variable");
  const File = mongoose.model("file");

  const errorReport = function(error, docs) { console.log(error, docs)}

  await Project.insertMany([project], errorReport);
  await Board.insertMany(boards, errorReport, {ordered: false});
  await ScriptNode.insertMany(scriptNodes, errorReport);
  await Item.insertMany(items, errorReport);
  await Page.insertMany(pages, errorReport);
  await Variable.insertMany(variables, errorReport);
  await File.insertMany(files, errorReport);

  return project.name // new name
}

exports.duplicateProject = async function (projectId) {
  let projectData = await exports.getAllOfProject(projectId)

  for (file of projectData.files) {
    const newFilename = generateFilename()
    await s3copy(file.filename, newFilename)
    file.filename = newFilename
    file.path = newFilename
  }

  return await exports.insertProjectAsDuplicate(projectData)
}

exports.updateProjectData = async (data, doUpdates=false) => {

  console.log("updateProjectData", doUpdates)

  const Project = mongoose.model("project");
    
  // grab mongoose models for exported data we want to compare
  const compareConfig = {
    boards: {model: mongoose.model("board"), fields: ["name", "description", "library"]},
    scriptNodes: {model: mongoose.model("scriptNode"), fields: ["name", "script"]},    
    items: {model: mongoose.model("item"), fields: ["value", "name"]},
    pages: {model: mongoose.model("page"), fields: ["menuEntry", "content"]},
    variables: {model: mongoose.model("variable"), fields: ["name", "value"]}
  }

  const diffs = [];
  function addDiff(path, v1, v2) {
    let d;
    if(typeof v1 == "string" && typeof v2 == "string") {
      d = {
        path,
        diffs: Diff.diffChars(v1, v2).filter(d => d.added || d.removed)
      } 
      if(d.diffs.length) {
        diffs.push(d)
      }
    } else {
      // save new value for non-string changes
      d = {path, diffs: [], newValue: v2}
      diffs.push(d)
    }
    return d
  }

  // check if we have the specified project
  let project = await Project.findById(data.project._id)

  let updateCounter = 0;

  if(project) {
    let d = addDiff("project/" + project._id + "/library", project.library, data.project.library)
    if(doUpdates && d.diffs.length) {
      console.log("updating project library")
      await Project.updateOne({_id: project._id}, {$set: {library: data.project.library}})
      updateCounter++;
    }

    for(let key of Object.keys(compareConfig)) {
      const model = compareConfig[key].model
      //console.log(key)
      for(let newObject of data[key]) {
        let currentObject = await model.findById(newObject._id)
        if(!currentObject) {
          console.log("new object found: ", key, newObject)
          diffs.push({path: key + "/" + newObject._id, newObject: newObject})
          if(doUpdates) {
            await model.create(newObject)
            updateCounter++;
          }
        } else {
          //console.log("comparing", newObject, currentObject)
          for(let field of compareConfig[key].fields) {
            if(!deepEqual(currentObject[field], newObject[field])) {
              addDiff(key + "/" + currentObject._id + "/" + field, currentObject[field], newObject[field])
              
              if(doUpdates) {
                console.log("updating " + key + "/" + currentObject._id + "/" + field)
                await model.updateOne({_id: currentObject._id}, {$set: {[field]: newObject[field]}})
                updateCounter++;

                // update connections for nodes if needed
                if(key == "scriptNodes" && field ==  "script") {
                  let ids = await exports.getConnectedNodeIds(newObject)
                  await model.updateOne({_id: currentObject._id}, {$set: {connectionIds: ids}})    
                }
              }
            }
          }          
        }
      }
    }
    
    return {"documentsUpdated": updateCounter, diffs}
  } 

  return "project not found"
}


