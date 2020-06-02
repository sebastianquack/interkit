let mongoose = require('mongoose')
const RestHapi = require('rest-hapi')
const Moment = require('moment')

const Log = RestHapi.getLogger('socket');
Log.logLevel = 'WARNING';

const makeQuery = (scope, refs, key) => {
  let where = {
      key: key,
      scope: scope
  };
  if(refs.playerId) where.player = mongoose.Types.ObjectId(refs.playerId);
  if(refs.boardId) where.board = mongoose.Types.ObjectId(refs.boardId);
  if(refs.nodeId) where.node = mongoose.Types.ObjectId(refs.nodeId);
  return where;
}

const checkRefs = (scope, refs) => {
  return scope == "player" && refs.playerId 
          || scope == "board" && refs.boardId
          || scope == "node" && refs.nodeId
          || scope == "playerNode" && refs.nodeId && refs.playerId
}

exports.setVar = async (scope, refs, key, value) => {
  console.log("setVar", scope, refs, key, value);

  if(checkRefs(scope, refs)) {

    let where = makeQuery(scope, refs, key);
    
    // try to find variable
    let variable = await RestHapi.list(RestHapi.models.variable, {$where: where}, Log);

    // create
    if(variable.docs.length == 0) {
      await RestHapi.create(RestHapi.models.variable, {...where, value}, Log);  
    // update
    } else {
      await RestHapi.update(RestHapi.models.variable, variable.docs[0]._id, {
        value: value 
      }, Log);  
    }
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
  }
}

exports.getBoard = async (boardId) => {
  let board = await RestHapi.find(RestHapi.models.board, boardId, null, Log);
  return board;
}

exports.getProjectForNode = async (node) => {
  let board = await exports.getBoard(node.board);
  let project = await RestHapi.find(RestHapi.models.project, board.project, null, Log);
  return project;
}

exports.logMessage = async (data) => {
  console.log("logMessage", data);
  let message = await RestHapi.create(RestHapi.models.message, data, Log);  
  return message;
}

exports.logPlayerToNode = async (playerId, node) => {
  console.log("logPlayerToNode", playerId, node._id);

  let project = await exports.getProjectForNode(node);
  let query = {
    player: mongoose.Types.ObjectId(playerId),  
    board: node.board,
    project: project._id
  }
  let nodeLogItem = await RestHapi.list(RestHapi.models.nodeLog, query, Log);

  if(nodeLogItem.docs.length == 0) {
    await RestHapi.create(RestHapi.models.nodeLog, {...query, node: mongoose.Types.ObjectId(node._id)}, Log);   
  } else {
    await RestHapi.update(RestHapi.models.nodeLog, nodeLogItem.docs[0]._id, {node: mongoose.Types.ObjectId(node._id)}, Log);   
  }  
}

exports.getPlayersForNode = async (nodeId) => {
  let query = {
    node: mongoose.Types.ObjectId(nodeId),  
  }
  let nodeLogItem = await RestHapi.list(RestHapi.models.nodeLog, query, Log);
  let playerIds = nodeLogItem.docs.map((doc)=>doc.player);
  return playerIds;
}

// creates or update an item
exports.createOrUpdateItem = async (payload, projectId) => {
  let items = await RestHapi.list(RestHapi.models.item, {key: payload.key, project: projectId}, Log)
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
exports.awardItemToPlayer = async (playerId, projectId, key) => {
  let items = await RestHapi.list(RestHapi.models.item, {key: key, project: projectId}, Log)
  if(items.docs.length == 1) {
    let item = items.docs[0];
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


// retrieves a players items
exports.getItemsForPlayer = async (playerId) => {
  let items = await RestHapi.getAll(RestHapi.models.player, playerId, RestHapi.models.item, "items", {}, Log);
  console.log("retrieved items for player", playerId, items.docs);
  return items.docs;
}

/*
exports.getItemForPlayerByKey = asnyc (playerId, key) => {
  let item = await RestHapi.getAll(RestHapi.models.player, playerId, RestHapi.models.item, "items", {key}, Log);
  if(item.docs.length) {
    console.log("retrieved item for player", item.docs[0]);
    return item.docs[0];
  } else {
    return null;
  }
}
*/

// uses moment add, ie moment().add({days:7,months:1}); // with object literal

exports.scheduleMessage = (timeFromNowObj, data) => {
  let message = {
    ...data,
    scheduled: true,
    deliveryTime: Moment().add(timeFromNowObj).valueOf()
  }
  exports.logMessage(message);  
}






