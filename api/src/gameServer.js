const RestHapi = require('rest-hapi')
const mongoose = require('mongoose');
const sandbox = require('./sandbox.js');

const db = require('./dbutil.js');

const Log = RestHapi.getLogger('socket');
Log.logLevel = 'WARNING';

let io = null;

// we store the sockets associated with players like so {playerId1: [socket1], playerId2: [socket2]|, ...}
let playerSockets = {}


/* SEND MESSAGE TO PLAYER */

// we send messages to individual sockets depending on recipients
const sendMessage = async (data) => {

  if(!data.recipients || data.recipients.length == 0) {
    console.log("sendMessage: empty recipients list, ignoring");
    return;
  }
  
  // prepare data for logging and sending
  let msgData = {...data, timestamp: Date.now()};
  if(!msgData.params) msgData.params = {};

  console.log("sendMessage to " + data.recipients.length + " recipients "
    + (msgData.message ? "'" + (msgData.label ? msgData.label + ": " : "") + msgData.message + "' " : "")
    + (Object.keys(msgData.params).length ? JSON.stringify(msgData.params) : "")
  );
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
      //console.log("emitting to", playerId);
      playerSockets[playerId].forEach((socket)=>{
        io.to(socket).emit('message', {...msgData, _id: msgId});  
      });
    }
  }
  //console.log("done emitting");
}


/* JOIN A NODE */

// log a player to a node and run onArrive script if requested
async function joinNode(data) {
  if(!data) data = {};
  if(!data.arriveFrom) data.arriveFrom = {};
  
  let id = mongoose.Types.ObjectId(data.nodeId);
  let newNode = await RestHapi.find(RestHapi.models.scriptNode, id, {}, Log)
    
  if(newNode) {
    //console.log("joining " + newNode.name);    
    
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

// being logged to a node means: 
// - a single player is only always in a single node per board
// - this node processes any incoming messages from the player
// - and receives messages {to: "all"} from other players in this node

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


/* HANDLE INCOMING MESSAGE FROM PLAYER */

// player input something (called via rest api)
async function handlePlayerMessage(data) {
  console.log("handlePlayerMessage playerId " + data.sender + ": '" + data.message + "' " + (data.params ? JSON.stringify(data.params) : ""));

  //let id = mongoose.Types.ObjectId(data.node);

  // new & safer: determine node based on server logs and ignore where client thinks it is
  //let nodeLogItem = await RestHapi.list(RestHapi.models.nodeLog, {player: data.sender, board: data.board}, Log);

  let currentNodeId = await db.getCurrentNodeId(data.sender, data.board)

  if(!currentNodeId) {
    console.log("cannot find player nodelog");
    return null;
  }
  
  let currentNode = await RestHapi.find(RestHapi.models.scriptNode, currentNodeId, {}, Log)
  
  // save incoming message
  await db.logMessage({...data, 
    //recipients: [data.sender], 
    node: currentNode._id, 
    board: currentNode.board,
    timestamp: Date.now()
  });

  // reset moveCounter when player interacts with system
  await db.setPlayerAttribute(data.sender, "moveCounter", 0);  

  await handleScript(currentNode, data.sender, "onReceive", data);  
  
  return true;
}
exports.handlePlayerMessage = handlePlayerMessage;


/* HANDLE DIRECT MESSAGE FROM ADMIN TO PLAYER */

async function handleAdminMessage(data) {
  console.log("admin message received", data);

  let msgData = {
    ...data, 
    sender: undefined,
    recipients: [data.sender], 
  }

  // just log and send to player
  await sendMessage(msgData); // send now
  return true;
}
exports.handleAdminMessage = handleAdminMessage;


/* INIT */

// set up socket event handling on server (called once on start)
exports.init = (listener) => {

  io = require("socket.io")(listener)

  io.on('connection', function (socket) {
    //console.log('socket connection');    

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
      
      if(!playerSockets[data.playerId]) {
        playerSockets[data.playerId] = []
      }

      if(playerSockets[data.playerId].indexOf(socket.id) == -1) {
        playerSockets[data.playerId].push(socket.id);  
      }
      
      console.log('registerPlayer socket with playerId: ' + data.playerId
        + " (connections for this player: " + playerSockets[data.playerId].length
        + ", total connected: " + Object.keys(playerSockets).length + ")"
      );
    })

  });
    

  // check for scheduled messages and moves
  
  const scheduledTasksInterval = setInterval(async ()=>{
    
    let start = Date.now()

    let messages = await db.deliverScheduledMessages(RestHapi.models.message, Log)  
    for(let m of messages) {
      await sendMessage(m);    
    }

    await db.executeScheduledMoves(RestHapi.models.nodeLog, Log);

    //console.log("completed scheduled task processinng in " + (Date.now() - start) + "ms")

  }, 2000);

} 


/* HANDLE SCRIPTS */

// helper to interpret a single number instead of delay object as seconds
function formatDelay(delay) {
  if(typeof delay == "number") {
    return {seconds: delay}
  } else {
    return delay
  }
}

// runs a node's script in the sandbox and updates socket connected clients
async function handleScript(currentNode, playerId, hook, msgData) {

  console.log("handleScript " + hook + " player " + playerId + " @" + currentNode.name)

  let node = currentNode._id;
  let board = currentNode.board;

  let timeMeasure = Date.now()

  sandbox.run(currentNode, playerId, hook, msgData, async (result)=>{
    
    let timeDiff = Date.now() - timeMeasure;
    let report = "handleScript result after " + timeDiff + "ms ";
    ["outputs", "interfaceCommands", "moveTos", "forwards"].forEach((key)=>{
        if(result[key] && result[key].length) report += key + ": " + result[key].length + " ";  
    })
    if(result.error) report += "scriptError";
    console.log(report)

    // error in script - send error message back to sender

    if(result.error) {
      sendMessage({
        message: result.error, 
        system: true, 
        recipients: [playerId],
        params: {error: true},
        node, board
      });
    }

    // limit amount of chained moves and forwards

    let moveCounter = await db.getPlayerAttribute(playerId, "moveCounter");
    if(!moveCounter) {
      await db.setPlayerAttribute(playerId, "moveCounter", 0);  
      moveCounter = 0;
    }
    let moveLimit = 4;

    // proccess collected script outputs
    
    if(result.outputs && result.outputs.length > 0) {

      let recipients = {
        "sender": [playerId]
      }
      
      for(let i = 0; i < result.outputs.length; i++) {
        let output = result.outputs[i];
        
        // call getPlayersForNode only when needed
        if(output.to == "all" || output.to == "others") {
          //console.log("load other players in node if needed")
          if(recipients["all"] == undefined && recipients["others"] == undefined) {
            recipients.all = await db.getPlayersForNode(node);
            recipients.others = recipients.all.filter(r=>r!=playerId); 
          }
        }

        // specify custom group of players as recipients if requested
        if(output.to == "custom" && output.players) {
          recipients["custom"] = output.players
        }

        // convert keyOrNames in filenames
        if(output.attachment) {
          if(output.attachment.keyOrName) {
            output.attachment.filename = await db.getAttachmentFilename(output.attachment.keyOrName, board.project)
          }
        }


        //console.log("recipients", recipients)
        //console.log("output.to", output.to)

        let msgObj = {...output, recipients: recipients[output.to], node, board, outputOrder: i}
        //console.log(msgObj);

        if(!output.delay) {
          await sendMessage(msgObj); // send now
        } else {

          await db.scheduleMessage(formatDelay(output.delay), msgObj); // send later
        }
      
      }
    }

    // send interface commands
    
    if(result.interfaceCommands.length) {

        result.interfaceCommands.forEach(async entry=> {

          let msgObj = {
            params: entry, 
            recipients: [playerId], node, board}
          //console.log(msgObj);

          if(!entry.delay) {
            await sendMessage(msgObj); // send now
          } else {
            await db.scheduleMessage(formatDelay(entry.delay), msgObj); // send later
          }
        })
    }

    // handle forwards

    if(result.forwards.length) {

      result.forwards.forEach(async forward=>{

        console.log("forward", forward)

        let forwardNodes = await RestHapi.list(RestHapi.models.scriptNode, {
          name: forward.node,
          board: forward.input.board
        }, Log)

        //console.log(forwardNodes);

        if(forwardNodes.docs.length > 0) {

          let forwardNode = forwardNodes.docs[0]

          if(moveCounter < moveLimit) {

            //console.log("forwarding input to node " + forwardNode.name)
            await db.setPlayerAttribute(playerId, "moveCounter", moveCounter+1) // count towards moveTo limit
            await handleScript(forwardNode, msgData.sender, "onReceive", msgData);
          
          } else {
            
            await abortTooManyMoves(playerId, node, board)        
          }
        }
      })
    }


    // handle moveTo requests - limitation: we process a single moveTo per script result

    if(result.moveTos.length) {

        result.moveTos.forEach(async moveTo => {
        
          // find destination via name and board
          let destinations = await RestHapi.list(RestHapi.models.scriptNode, {
            name: moveTo.destination,
            board: currentNode.board
          }, Log)
          
          if(destinations.docs.length == 1) {
            let destination = destinations.docs[0];
            //console.log("processing move to node " + destination.name);
            if(destination._id != currentNode._id) {
              
              // move player(s) immediately
              if(!moveTo.delay) {

                await db.setPlayerAttribute(playerId, "moveCounter", moveCounter+1)

                if(moveCounter < moveLimit) {

                  if(!moveTo.all) {
                    // move single player to different node
                    await joinNode({playerId, nodeId: destination._id, execOnArrive: moveTo.execOnArrive});

                  } else {
                    // move multiple players at once
                    await joinNodeMulti({fromNode: currentNode, toNode: destination, execOnArrive: moveTo.execOnArrive});
                  }
                
                } else {
                  await abortTooManyMoves(playerId, node, board)        
                }

              // schedule move of players for later
              } else {

                //console.log("scheduling move...")
                
                await db.scheduleMoveTo(playerId, destination, formatDelay(moveTo.delay));  
                
                if(moveTo.all) {
                  console.log("warninng - scheduled moveTo all not implemented yet")
                }

              }

            } else {
              console.log("node " + moveTo.destination + " not found");
              await sendMessage({
                message: "node " + moveTo.destination + " not found", 
                system: true, 
                recipients: [playerId],
                node, board
              });
            }
          }

        })

    }

    /*if(result.outputs.length == 0 
    && !result.interfaceCommand 
    && !result.moveTos.length 
    && !result.forwards.length) {

      console.log("no outputs on hook ", hook);

      // if there are on outputs, send empty message to switch player to node
      if(hook == "onArrive") {
        await sendMessage({
          recipients: [playerId], 
          node, board,
          params: {interfaceCommand: "nodeInfo"}
        }) 
      }

    }*/

    if(!result.moveTo && result.forwards.length == 0) {
      // reset move counter if no move or forward requested
      await db.setPlayerAttribute(playerId, "moveCounter", 0)
    }
 
  });

}


async function abortTooManyMoves(playerId, node, board) {

  console.log("too many moves, aborting")
  await sendMessage({
    message: "too many chained moveTos in script, aborting", 
    system: true, 
    recipients: [playerId],
    node, board
  });
  await db.setPlayerAttribute(playerId, "moveCounter", 0)

}

