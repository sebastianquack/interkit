const {VM} = require('vm2');
const db = require('./dbutil.js');

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

  let varCache = {
    player: await db.getVars("player", {playerId}),
    node: await db.getVars("node", {nodeId: node._id}),
    playerNode: await db.getVars("playerNode", {nodeId: node._id, playerId}),
    board: await db.getVars("board", {boardId: node.board}),
  }

  let project = await db.getProjectForNode(node);
  
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
          db.setVar("player", {playerId}, key, value); 
        },
      },
      here: {
        ...varCache.node,
        set: function (key, value) { 
          this[key] = value;
          db.setVar("node", {nodeId: node._id}, key, value); 
        },
      },
      playerHere: {
        ...varCache.playerNode,
        set: function (key, value) { 
          this[key] = value;
          db.setVar("playerNode", {playerId, nodeId: node._id}, key, value); 
        },
      },
      board: {
        ...varCache.board,
        set: function (key, value) { 
          this[key] = value;
          db.setVar("board", {boardId: node.board}, key, value); 
        },
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
      getItems: async () => { return await db.getItemsForPlayer(playerId) },
      interface: (key) => { result.interfaceCommand = key },
      input: input
    }  
  });

  let board = await db.getBoard(node.board);

  let runScript = board.library + " ; " + node.script;
  
  // expand script to execute appropriate hook
  switch(hook) {
    case "onMessage":
      runScript += `; if(typeof onMessage === "function") onMessage();`; 
      break;
    case "onArrive":
      runScript += `; if(typeof onArrive === "function") onArrive();`; 
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

