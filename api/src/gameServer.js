const RestHapi = require('rest-hapi')
const mongoose = require('mongoose');
const sandbox = require('./sandbox.js');

const db = require('./dbutil.js');

const Log = RestHapi.getLogger('socket');
Log.logLevel = 'WARNING';

let io = null;

// we store the sockets associated with players like so {playerId1: socket1, playerId2: socket2, ...}
let playerSockets = {}

// we send messages to individual sockets depending on recipients
const sendMessage = async (data) => {

  if(data.recipients.length == 0) {
    console.log("sendMessage: empty recipients list, ignoring");
    return;
  }
  
  // prepare data for logging and sending
  let msgData = {...data, timestamp: Date.now()};
  if(!msgData.params) msgData.params = {};

  console.log("sendMessage '"+msgData.label+"' '"+msgData.message+"'");
  //console.log("playerSockets", playerSockets);
  
  // get an id for the message
  let msgId = data._id;
  if(!msgId) {
    let m = await db.logMessage(msgData);
    msgId = m._id;
  }
  
  // send to all recipients that are currently connected on socket
  for(playerId of data.recipients) {
    if(playerSockets[playerId]) {
      console.log("emitting to", playerId);
      io.to(playerSockets[playerId]).emit('message', {...msgData, _id: msgId});
    }
  }
  console.log("done emitting");
}

// log a player to a node and run onArrive script if requested
async function joinNode(data) {
  if(!data) data = {};
  if(!data.arriveFrom) data.arriveFrom = {};
  
  let id = mongoose.Types.ObjectId(data.nodeId);
  let newNode = await RestHapi.find(RestHapi.models.scriptNode, id, {}, Log)
    
  if(newNode) {
    console.log("joining " + newNode.name);    
    
    data.arriveFrom.prevNode = await db.logPlayerToNode(data.playerId, newNode);

    if(data.execOnArrive)
      handleScript(newNode, data.playerId, "onArrive", data.arriveFrom);
    else 
      // empty message to set player to node
      sendMessage({
        recipients: [data.playerId], 
        node: newNode._id, 
        board: newNode.board, 
        params: {interfaceCommand: "nodeInfo"}
      }) 

    return true;
  
  } else {
    console.log("node " + data.nodeId + " not found!");
    return null;
  }
}

exports.joinNode = joinNode;

// move a set of players to a new room
// step 1: move all players
// step 2: run onArrive scripts for all players

async function joinNodeMulti(data) {
  if(!data) data = {};
  if(!data.arriveFrom) data.arriveFrom = {};

  console.log("multi joining ", data);

  let playerIds = await db.getPlayersForNode(data.fromNode._id);

  // move nodelogs
  for(let playerId of playerIds) {
    console.log(playerId);
    data.arriveFrom.prevNode = await db.logPlayerToNode(playerId, data.toNode);
  }

  // run onArrive script for all players
  if(data.execOnArrive) {
    for(let playerId of playerIds) {    
      handleScript(data.toNode, playerId, "onArrive", data.arriveFrom);
    }
  } else {
    // empty message to set player to node
    sendMessage({recipients: playerIds, node: data.toNode._id, board: data.toNode.board, params: {interfaceCommand: "nodeInfo"}}) 
  }
}

// player input something (called via rest api)
    
async function handlePlayerMessage(data) {
  console.log("message received", data);

  //let id = mongoose.Types.ObjectId(data.node);

  // new & safer: determine node based on server logs and ignore where client thinks it is
  let nodeLogItem = await RestHapi.list(RestHapi.models.nodeLog, {player: data.sender, board: data.board}, Log);

  if(nodeLogItem.docs.length == 0) {
    console.log("cannot find player nodelog");
    return null;
  }
  
  let currentNode = await RestHapi.find(RestHapi.models.scriptNode, nodeLogItem.docs[0].node, {}, Log)
  
  // save incoming message
  await db.logMessage({...data, 
    recipients: [data.sender], 
    node: currentNode._id, 
    board: currentNode.board,
    timestamp: Date.now()
  });
  await handleScript(currentNode, data.sender, "onReceive", data);  
  
  return true;
}


exports.handlePlayerMessage = handlePlayerMessage;

// set up socket event handling on server (called once on start)

exports.init = (listener) => {

  io = require("socket.io")(listener)

  io.on('connection', function (socket) {
    console.log('socket connection');    

    socket.on('disconnect', (reason) => {
      console.log("disconnect event for socket ", socket.id);
      // todo remove from playerSockets object
      /*for (const [playerId, socketId] of playerSockets) {
        if(socketId == socket.id) {
          playerSockets[playerId] = null;
        }
      }*/
    });

    // this is called once when PlayerContainer mounts on client 
    // - limitation for now, player can only have one socket (cannot play with multiple tabs open)
    
    socket.on('registerPlayer', async (data) => {
      console.log('registerPlayer');
      playerSockets[data.playerId] = socket.id;
      console.log(Object.keys(playerSockets))
    })

  });
    

  // check for scheduled messages, deliver and inform connected players via socket
  
  const scheduleMessagesInterval = setInterval(async ()=>{
    let clients = Object.keys(io.sockets.sockets);

    let messages = await db.deliverScheduledMessages(RestHapi.models.message, Log)  
    
    for(let m of messages) {
      await sendMessage(m);    
    }
  }, 10000);

} 

// runs a node's script in the sandbox and updates socket connected clients

async function handleScript(currentNode, playerId, hook, msgData) {

  console.log("handleScript playerId", playerId)

  let node = currentNode._id;
  let board = currentNode.board;

  sandbox.run(currentNode, playerId, hook, msgData, async (result)=>{
    
    console.log("script result", result);

    // error in script - send error message back to sender

    if(result.error) {
      sendMessage({
        message: result.error, 
        system: true, 
        recipients: [playerId],
        node, board
      });
    }

    // proccess collected script outputs
    
    if(result.outputs.length > 0) {

      let recipients = {
        "all": await db.getPlayersForNode(node),
        "sender": [playerId]
      }
      recipients["others"] = recipients["all"].filter(r=>r!=playerId); 

      for(let i = 0; i < result.outputs.length; i++) {
        let output = result.outputs[i];
        let msgObj = {...output, recipients: recipients[output.to], node, board, outputOrder: i}
        console.log(msgObj);

        if(!output.scheduleFor) {
          await sendMessage(msgObj); // send now
        } else {
          await db.scheduleMessage(output.scheduleFor, msgObj); // send later
        }
      
      }
    }

    // send off interface commands

    if(result.interfaceCommand) {
      await sendMessage({params: {
            interfaceCommand: result.interfaceCommand,
            interfaceOptions: result.interfaceOptions
          }, 
          recipients: [playerId], node, board});  
    }

    // handle moveTo requests

    if(result.moveTo) {

      // limit amount of chained moves
      let moveCounter = await db.getPlayerAttribute(playerId, "moveCounter");
      if(!moveCounter) {
        await db.setPlayerAttribute(playerId, "moveCounter", 0);  
        moveCounter = 0;
      }

      if(moveCounter < 4) {
        
        // find destination via name and board
        let destinations = await RestHapi.list(RestHapi.models.scriptNode, {
          name: result.moveToOptions.destination,
          board: currentNode.board
        }, Log)
        
        if(destinations.docs.length == 1) {
          let destination = destinations.docs[0];
          console.log("moving player to node " + destination.name);
          if(destination._id != currentNode._id) {
            
            await db.setPlayerAttribute(playerId, "moveCounter", moveCounter+1)
            
            // move player directly on backend
            setTimeout(async ()=>{

              if(!result.moveToOptions.all) {
                // move single player to different node
                await joinNode({playerId, nodeId: destination._id, execOnArrive: result.moveToOptions.execOnArrive});
                
              } else {
                // move multiple players at once
                await joinNodeMulti({fromNode: currentNode, toNode: destination, execOnArrive: result.moveToOptions.execOnArrive});
              }

            }, result.moveToOptions.delay ? result.moveToOptions.delay : 0);              

          } else {
            console.log("node " + result.moveToOptions.destination + " not found");
            await sendMessage({
              message: "node " + result.moveToOptions.destination + " not found", 
              system: true, 
              recipients: [playerId],
              node, board
            });
          }
        }

      } else {

        console.log("too many moves, aborting")
          await sendMessage({
            message: "too many chained moveTos in script, aborting", 
            system: true, 
            recipients: [playerId],
            node, board
          });
          await db.setPlayerAttribute(playerId, "moveCounter", 0)
        }

    } else {
      // reset move counter if no move requested
      await db.setPlayerAttribute(playerId, "moveCounter", 0)
    }
    
    if(result.outputs.length == 0 && !result.interfaceCommand && !result.moveTo) {

      console.log("no outputs on hook ", hook);

      // if there are on outputs, send empty message to switch player to node
      if(hook == "onArrive") {
        await sendMessage({
          recipients: [playerId], 
          node, board,
          params: {interfaceCommand: "nodeInfo"}
        }) 
      }
    
    }
 
  });

}

