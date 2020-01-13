let mongoose = require('mongoose')
const RestHapi = require('rest-hapi')

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
