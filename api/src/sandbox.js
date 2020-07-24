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
    moveTos: [],
    forwards: [],
    interfaceCommands: []
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
    if(!msgData.params) msgData.params = {};
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
      index: msgData.params ? (msgData.params.index + 1) : undefined,
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
      currentNode: node ? node.name : null,
      player: {
        ...varCache.player,
        id: playerId,
        set: async function (key, value) { 
          this[key] = value;
          await db.setVar("player", {player: playerId, project: project._id}, key, value); 
        },
      },
      here: {
        ...varCache.node,
        set: async function (key, value) { 
          this[key] = value;
          await db.setVar("node", {node: node._id, project: project._id}, key, value); 
        },
      },
      playerHere: {
        ...varCache.playerNode,
        set: async function (key, value) { 
          this[key] = value;
          await db.setVar("playerNode", {player: playerId, node: node._id, project: project._id}, key, value); 
        },
      },
      board: {
        ...varCache.board,
        set: async function (key, value) { 
          this[key] = value;
          await db.setVar("board", {board: node.board, project: project._id}, key, value); 
        },
      },
      project: {
        ...varCache.project,
        set: async function (key, value) { 
          this[key] = value;
          await db.setVar("project", {project: project._id}, key, value); 
        },
      },
      boards: {
        list: async (boardKey) => {
          await db.listBoardForPlayer(playerId, boardKey, project._id, true);
          result.interfaceCommands.push({interfaceCommand: "updateBoards"})
        },
        unlist: async (boardKey) => {
          await db.listBoardForPlayer(playerId, boardKey, project._id, false);
          result.interfaceCommands.push({interfaceCommand: "updateBoards"})
        }
      },
      
      send: {
        text: (message, params={}) => { result.outputs.push({
          message, 
          label: params.label ? params.label : varCache.board.narrator, 
          to: params.to ? params.to : "sender",
          system: params.system ? true : false,
          delay: params.delay ? params.delay : null,
          forceOpen: params.forceOpen
        })}, 

        system: (message, params={}) => { result.outputs.push({
          message, 
          system: true,
          to: params.to ? params.to : "sender",
          delay: params.delay ? params.delay : null,
          forceOpen: params.forceOpen,
          params: {...params}
        })}, 

        option: (message, params={}) => { result.outputs.push({
          message, 
          params: {
            ...params, // add possibility to send additional params
            option: true,
            key: params.key ? params.key : undefined
          },
          to: params.to ? params.to : "sender",
          delay: params.delay ? params.delay : null,
          forceOpen: params.forceOpen
        })},

        // this takes an array of options ["yes", "no"]
        options: (optionsArray, params={}) => { result.outputs.push({
          params: {
            optionsArray,
            ...params, // add possibility to send additional params
          },
          to: params.to ? params.to : "sender",
          delay: params.delay ? params.delay : null,
          forceOpen: params.forceOpen
        })},              
        
        image: async (keyOrName, params={}) => { 
            result.outputs.push({
            attachment: {
              mediatype: "image", 
              keyOrName,
              //filename: await db.getAttachmentFilename(keyOrName, project._id),
              alt: params.alt ? params.alt : undefined,
            }, 
            label: params.label ? params.label : varCache.board.narrator,
            to: params.to ? params.to : "sender",
            delay: params.delay ? params.delay : null,
            forceOpen: params.forceOpen
        })},

        audio: (keyOrName, params={}) => { result.outputs.push({
          attachment: {
            mediatype: "audio", 
            keyOrName: keyOrName, // load filename in game server
            //filename: await db.getAttachmentFilename(keyOrName, project._id),
          }, 
          params: params,
          label: params.label ? params.label : varCache.board.narrator,
          to: params.to ? params.to : "sender",
          delay: params.delay ? params.delay : null,
          forceOpen: params.forceOpen,
        })},  

        location: async (latlng, params={}) => { result.outputs.push({
            attachment: {
              mediatype: "GPS", 
              imgSrc: await db.createLocationThumbnail(latlng),
              lat: latlng.lat,
              lng: latlng.lng,
            }, 
            to: params.to ? params.to : "sender",
            delay: params.delay ? params.delay : null,
            forceOpen: params.forceOpen,
            label: params.label ? params.label : varCache.board.narrator
        })},

      },

      moveTo: (nodeId, params={}) => { result.moveTos.push({
          destination: nodeId, 
          delay: params.delay ? params.delay : undefined, 
          all: params.for == "all",
          execOnArrive: !params.hasOwnProperty('execOnArrive') ? true : params.execOnArrive
        }) 
      },

      // this is mainly for forwarding the input object to others in the node
      echo: (input, params={}) => {
        result.outputs.push({
          ...input,
          label: params.label ? params.label : varCache.player.name,
          system: params.system ? true : false,
          to: params.to ? params.to : "others",
          delay: params.delay ? params.delay : null,
          attachment: input.filename ? {
            mediatype: input.type,
            keyOrName: input.attachment.key
          } : undefined
        })
      },

      forward: (input, node) => {
        result.forwards.push({input, node});
      },

      alert: (alertMessage) => {
        result.interfaceCommands.push({
          interfaceCommand: "alert",
          interfaceOptions: {alertMessage}
        })
      },

      createOrUpdateItem: async (payload) => { await db.createOrUpdateItem(payload, project._id) },
      awardItem: async (key, params = {}) => { return await db.awardItemToPlayer(playerId, project._id, key, params.to) },
      removeItem: (key, params = {}) => { db.removeItemFromPlayer(playerId, project._id, key, params.from) },
      getItem: async (key) => { return await db.getItem(key, project._id) },
      getItems: async () => { return await db.getItemsForPlayer(playerId) },
      getItemsQuery: async (query) => {return await db.getItemsQuery(project._id, query) },
      
      distance: (pos1, pos2) => { return geolib.getDistance({latitude: pos1.lat, longitude: pos1.lng}, {latitude: pos2.lat, longitude: pos2.lng}, 1); },
      
      interface: async (key, params={}) => { 
        let defaultInputs = {
          text: true,
          attachments: true,
          gps: true,
          image: true,
          audio: true,
          qr: true
        }
        if(key == "inputs") params = {...defaultInputs, ...params}
        result.interfaceCommands.push({interfaceCommand: key, interfaceOptions: params}); 
        await db.persistPlayerInterface(project._id, playerId, key, params, node.board); 
      },

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

  let runScript = project.library + "\n; " + board.library + "\n; " + node.script;
  
  // expand script to execute appropriate hook
  switch(hook) {
    case "onReceive":
      runScript += `\n; if(typeof onMessage === "function") onMessage(input);`;  // deprecated
      runScript += `\n; if(typeof onReceive === "function") onReceive(input);`; 
      break;
    case "onArrive":
      runScript += `\n; if(typeof onArrive === "function") onArrive(from);`; 
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
    let report = "error: " + err.message + " details: " + err.stack
    console.log("script execution failed", report)
    if(!sentResponse) {
      callback({error: report});  
    }
  }
}

