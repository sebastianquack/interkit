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
    playerNode: await db.getVars("playerNode", {node: node._id, player: playerId, project: project._id}),
    board: await db.getVars("board", {board: node.board, project: project._id}),
    project: await db.getVars("project", {project: project._id}),
  }

  // default values
  if(!varCache.board.narrator) varCache.board.narrator = "narrator";

  let input = {};
  if(msgData) {
      
    //format input to be somewhat consistent with send api
    let type = "text";
    if(msgData.params && msgData.params.option) type = "option";
    if(msgData.attachment) type = msgData.attachment.mediatype; // image or audio

    input = {
      // deprecated
      ...msgData, 
      message: msgData.message ? msgData.message.trim().toLowerCase() : "",
      attachment: msgData.attachment ? msgData.attachment : {mediatype: null},

      // current formatting
      type,
      text: msgData.message ? msgData.message.trim().toLowerCase() : null,
      raw: msgData.message,
      key: msgData.params ? msgData.params.key : undefined,
      filename: msgData.attachment ? msgData.attachment.key : null, // it's actually the "key", not the filename. 
      coords: type == "GPS" ? {lat: msgData.attachment.lat, lng: msgData.attachment.lng} : null,
      QRcode: type == "QRcode" ? msgData.attachment.QRCode : null, 

      msgData: msgData // pass original msgData in for debugging
    }
    
  }
  
  const vm = new VM({
    timeout: 1000, // timeout for script exeuction
    sandbox: {
      input: input,
      from: msgData,

      player: {
        ...varCache.player,
        id: playerId,
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
        list: (boardKey) => db.listBoardForPlayer(playerId, boardKey, project._id, true),
        unlist: (boardKey) => db.listBoardForPlayer(playerId, boardKey, project._id, false)
      },
      
      send: {
        text: (message, options={}) => { result.outputs.push({
          message, 
          label: options.label ? options.label : varCache.board.narrator, 
          to: options.to ? options.to : "sender",
          system: options.system ? true : false,
          delay: options.delay ? options.delay : null,
          forceOpen: options.forceOpen
        })}, 

        system: (message, options={}) => { result.outputs.push({
          message, 
          system: true,
          to: options.to ? options.to : "sender",
          delay: options.delay ? options.delay : null,
          forceOpen: options.forceOpen
        })}, 

        option: (message, options={}) => { result.outputs.push({
          message, 
          params: {
            ...options, // add possibility to send additional params
            option: true,
            key: options.key ? options.key : undefined
          },
          to: options.to ? options.to : "sender",
          delay: options.delay ? options.delay : null,
          forceOpen: options.forceOpen
        })},       
        
        image: async (keyOrName, options={}) => { 
            result.outputs.push({
            attachment: {
              mediatype: "image", 
              filename: await db.getAttachmentFilename(keyOrName, project._id),
              alt: options.alt ? options.alt : undefined,
            }, 
            label: options.label ? options.label : varCache.board.narrator,
            to: options.to ? options.to : "sender",
            delay: options.delay ? options.delay : null,
            forceOpen: options.forceOpen
        })},

        audio: async (keyOrName, options={}) => { result.outputs.push({
          attachment: {
            mediatype: "audio", 
            filename: await db.getAttachmentFilename(keyOrName, project._id),
          }, 
          label: options.label ? options.label : varCache.board.narrator,
          to: options.to ? options.to : "sender",
          delay: options.delay ? options.delay : null,
          forceOpen: options.forceOpen
        })},  
      },

      moveTo: (nodeId, options={}) => { result.moveTo = true; result.moveToOptions = {
        destination: nodeId, 
        delay: options.delay ? options.delay : undefined, 
        all: options.for == "all",
        execOnArrive: !options.hasOwnProperty('execOnArrive') ? true : options.execOnArrive
      }},

      // this is mainly for forwarding the input object to others in the node
      echo: (input, options={}) => {
        result.outputs.push({
          ...input,
          label: options.label ? options.label : varCache.player.name,
          to: options.to ? options.to : "others",
        })
      },

      alert: (alertMessage) => {
        result.interfaceCommand = "alert";
        result.interfaceOptions = {alertMessage};
      },

      createOrUpdateItem: async (payload) => { await db.createOrUpdateItem(payload, project._id) },
      awardItem: (key, options = {}) => { db.awardItemToPlayer(playerId, project._id, key, options.to) },
      removeItem: (key, options = {}) => { db.removeItemFromPlayer(playerId, project._id, key, options.from) },
      getItem: async (key) => { return await db.getItem(key, project._id) },
      getItems: async () => { return await db.getItemsForPlayer(playerId) },
      getItemsQuery: async (query) => {return await db.getItemsQuery(project._id, query) },
      
      distance: (pos1, pos2) => { return geolib.getDistance({latitude: pos1.lat, longitude: pos1.lng}, {latitude: pos2.lat, longitude: pos2.lng}, 1); },
      
      // todo: rework
      interface: (key) => { result.interfaceCommand = key },

      // deprecated / broken - take out soon
      // moveTo: (nodeId, delay = 0, all = undefined) => { result.moveTo = true; result.moveToOptions = {destination: nodeId, delay, all} },
      scheduleOutput: (timeFromNowObj, message, label=varCache.board.narrator) => { 
        db.scheduleMessage(timeFromNowObj, {recipients: [playerId], message, label, node: node._id, board: node.board}) },
      output: (message, label=varCache.board.narrator) => { result.outputs.push({message, label}); },
      option: (message) => { result.outputs.push({message, params: {option: true}}); },       
      image: (filename, alt="default image", label=varCache.board.narrator) => { result.outputs.push({attachment: {mediatype: "image", filename, alt}, label})},
      audio: (filename, label=varCache.board.narrator) => { result.outputs.push({attachment: {mediatype: "audio", filename}, label})},
    }
  });

  let board = await db.getBoard(node.board);

  let runScript = board.library + " ; " + node.script;
  
  // expand script to execute appropriate hook
  switch(hook) {
    case "onReceive":
      runScript += `; if(typeof onMessage === "function") onMessage(input);`;  // deprecated
      runScript += `; if(typeof onReceive === "function") onReceive(input);`; 
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

