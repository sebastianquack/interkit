const {VM} = require('vm2');
const db = require('./dbutil.js');
const geolib = require('geolib');

/*const itemToAttachment = async (playerId, key) {
  let item = await db.getItemForPlayerByKey(playerId, key);
  if(item) {
    return {
      mediatype: item.type == "location" ? ""
    }  
  }
}*/

module.exports.run = async function(node, playerId, hook, msgData, callback) {
  let sentResponse = false;

  let t = setTimeout(()=>{
    sentResponse = true;
    callback("timeout"); // timeout for awaiting async script effects
  }, 10000);

  let result = {
    outputs: [],
    moveTo: null
  };

  let project = await db.getProjectForNode(node);
  
  let varCache = {
    player: await db.getVars("player", {player: playerId, project: project._id}),
    node: await db.getVars("node", {node: node._id, project: project._id}),
    playerNode: await db.getVars("playerNode", {nodeId: node._id, playerId, project: project._id}),
    board: await db.getVars("board", {board: node.board, project: project._id}),
    project: await db.getVars("project", {project: project._id}),
  }
  
  // default values
  if(!varCache.board.narrator) varCache.board.narrator = "narrator";

  let input = {};
  if(msgData) {
    input = msgData;
    input.raw = input.message;
    if(input.message)
      input.message = msgData.message ? msgData.message.trim().toLowerCase() : "";
    if(!input.attachment) input.attachment = {mediatype: null}
  }
  
  const vm = new VM({
    timeout: 1000, // timeout for script exeuction
    sandbox: {
      player: {
        ...varCache.player,
        set: function (key, value) { 
          this[key] = value;
          db.setVar("player", {player: playerId, project: project._id}, key, value); 
        },
      },
      here: {
        ...varCache.node,
        set: function (key, value) { 
          this[key] = value;
          db.setVar("node", {node: node._id, project: project._id}, key, value); 
        },
      },
      playerHere: {
        ...varCache.playerNode,
        set: function (key, value) { 
          this[key] = value;
          db.setVar("playerNode", {player: playerId, node: node._id, project: project._id}, key, value); 
        },
      },
      board: {
        ...varCache.board,
        set: function (key, value) { 
          this[key] = value;
          db.setVar("board", {board: node.board, project: project._id}, key, value); 
        },
      },
      project: {
        ...varCache.project,
        set: function (key, value) { 
          this[key] = value;
          db.setVar("project", {project: project._id}, key, value); 
        },
      },
      boards: {
        list: (boardName) => db.listBoardForPlayer(playerId, boardName, project._id, true),
        unlist: (boardName) => db.listBoardForPlayer(playerId, boardName, project._id, false)
      },
      output: (message, label=varCache.board.narrator) => { result.outputs.push({message, label}); },
      scheduleOutput: (timeFromNowObj, message, label=varCache.board.narrator) => { 
        db.scheduleMessage(timeFromNowObj, {recipients: [playerId], message, label, node: node._id, board: node.board}) },
      option: (message) => { result.outputs.push({message, params: {option: true}}); },       
      image: (filename, alt="default image", label=varCache.board.narrator) => { result.outputs.push({attachment: {mediatype: "image", filename, alt}, label})},
      audio: (filename, label=varCache.board.narrator) => { result.outputs.push({attachment: {mediatype: "audio", filename}, label})},
      //item: async (key, label=varCache.board.narrator) => { result.outputs.push({attachment: await itemToAttachment(playerId, key), label})},
      moveTo: (room, delay = 0, all = undefined) => { result.moveTo = true; result.moveToOptions = {destination: room, delay, all} },
      createOrUpdateItem: (payload) => { db.createOrUpdateItem(payload, project._id) },
      awardItem: (key) => { db.awardItemToPlayer(playerId, project._id, key) },
      removeItem: (key) => { db.removeItemFromPlayer(playerId, project._id, key) },
      getItem: async (key) => { return await db.getItem(key, project._id) },
      getItems: async () => { return await db.getItemsForPlayer(playerId) },
      interface: (key) => { result.interfaceCommand = key },
      distance: (pos1, pos2) => { return geolib.getDistance({latitude: pos1.lat, longitude: pos1.lng}, {latitude: pos2.lat, longitude: pos2.lng}, 1); },
      
      input: input,
      from: msgData
    }  
  });

  let board = await db.getBoard(node.board);

  let runScript = board.library + " ; " + node.script;
  
  // expand script to execute appropriate hook
  switch(hook) {
    case "onMessage":
      runScript += `; if(typeof onMessage === "function") onMessage(input);`; 
      break;
    case "onArrive":
      runScript += `; if(typeof onArrive === "function") onArrive(from);`; 
      break;
  }
  //console.log("runScript", runScript);

  try {
    let output = await vm.run(runScript);
    //console.log("script output: " + output);
    //console.log(result);
    clearTimeout(t);
    if(!sentResponse) {
      callback(result); 
    }
  } catch (err) {
    clearTimeout(t);
    console.error('script execution failed!', err);
    if(!sentResponse) {
      callback({error: err.toString()});  
    }
  }
}

