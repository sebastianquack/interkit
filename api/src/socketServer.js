const RestHapi = require('rest-hapi')
const mongoose = require('mongoose');
const sandbox = require('./sandbox.js');

const db = require('./dbutil.js');

const Log = RestHapi.getLogger('socket');
Log.logLevel = 'WARNING';


let io = null;

// new: we store the sockets associated with players like so {playerId1: socket1, playerId2: socket2, ...}
let playerSockets = {}

// new: we send messages to individual sockets depending on recipients

const sendMessage = async (data) => {
  
  // prepare data for logging and sending
  let msgData = {...data, timestamp: Date.now()};
  if(!msgData.params) msgData.params = {};

  console.log("sendMessage", msgData);

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
      //playerSockets[playerId].emit('message', {...msgData, _id: msgId})      

      io.to(playerSockets[playerId]).emit('message', {...msgData, _id: msgId});
    }
  }
}


/*
// OLD: socket-send message to a single player

const emitMessage = async (emitter, data) => {
  let msgData = {...data, timestamp: Date.now()};
  if(!msgData.params) msgData.params = {};
  
  let id = data._id;
  if(!id) {
    let m = await db.logMessage(msgData);
    id = m._id;
  }
  if(emitter)
    emitter.emit('message', {...msgData, _id: id});         
}

// OLD: socket-send message to all players in a room 

const emitInRoom = async (room, data) => {
  let msgData = {...data, timestamp: Date.now()};
  if(!msgData.params) msgData.params = {};
  
  let m = await db.logMessage(msgData);
  io.in(room).emit('message', {...msgData, _id: m._id});         
}
*/

// log a player to a node and run onArrive script if requested

async function joinRoom(data) {
  console.log("joining " + data.nodeId);
  /*if(socket) {
    await socket.join(data.room);
    
    socket.room = data.room;
    socket.playerId = data.playerId;
  }*/
    
  console.log("trying to find this node in db");
  let id = mongoose.Types.ObjectId(data.nodeId);
  let newNode = await RestHapi.find(RestHapi.models.scriptNode, id, {}, Log)

  if(newNode) {
    // todo: make more customizable
    /* socket.emit('message', {system: true, message: "you are now in " + newNode.name});  
    if(newNode.multiPlayer) {
      socket.broadcast.in(socket.room).emit('message', {system: true, message: "a human arrived"});
    } */
    
    await db.logPlayerToNode(data.playerId, newNode);

    if(data.execOnArrive)
      handleScript(newNode, data.playerId, "onArrive", data.arriveFrom);
  
  } else {
    console.log("node " + data.room + " not found!");
  }
}

// move a set of players to a new room
// step 1: move all players
// step 2: run onArrive scripts for all players (todo: option for only once)

async function joinRoomMulti(data) {
  console.log("multi joining ", data);

  /*
  console.log("moving sockets...");  
  // move all connected sockets over
  let clients = io.sockets.adapter.rooms[data.fromNode._id].sockets;   
  for (let clientId in clients ) {
     console.log("socket id", clientId);  
     //this is the socket of each client in the current room.
     let clientSocket = io.sockets.connected[clientId];
     await clientSocket.join(data.toNode._id);
     clientSocket.room = data.toNode._id;
  }
  */
 
  let playerIds = await db.getPlayersForNode(data.fromNode._id);

  // move nodelogs
  console.log("moving player nodelogs", playerIds);

  for(let playerId of playerIds) {
    console.log(playerId);
    await db.logPlayerToNode(playerId, data.toNode);
  }

  // run onArrive script for all players
  if(data.execOnArrive) {
    for(let playerId of playerIds) {    
      //let s = getSocketForPlayerId(playerId)
      //console.log("found socket", s);
      //handleScript(io, s, data.toNode, playerId, "onArrive");
      handleScript(data.toNode, playerId, "onArrive");
    }
  }
}


// OLD: get socket from playerId
/*
const getSocketForPlayerId = (id) => { 
  let sockets = io.sockets.connected;
  for (let socketId in sockets) {
    let socket = io.sockets.connected[socketId];
     //this is the socket of each client in the room.
     if(socket.playerId == id)
      return socket;
  }
  return null
}
*/


// get players connected to a room 

const getPlayerIdsForRoom = async (roomName) => {
  let playerIds = [];
  
  /*let clients = io.sockets.adapter.rooms[roomName].sockets;   
  for (let clientId in clients ) {
     //this is the socket of each client in the room.
     let clientSocket = io.sockets.connected[clientId];
     playerIds.push(clientSocket.playerId);
  }

  console.log("playerIds", playerIds);*/

  //get users who are not currently connected but 
  //who's last node on this board is this node
  console.log("checking nodelog");

  let id = mongoose.Types.ObjectId(roomName);
  let node = await RestHapi.find(RestHapi.models.scriptNode, id, {}, Log)  
  let offlinePlayers = await RestHapi.list(RestHapi.models.nodeLog, {
    board: node.board,
    node: node._id,
  }, Log);
  offlinePlayers.docs.forEach((record)=>{
    if(playerIds.indexOf(record.player.toString()) == -1) {
      playerIds.push(record.player.toString());
    }
  })
  
  console.log("playerIds", playerIds);

  return playerIds;
}

// set up socket event handling on server (called once on start)

exports.init = (listener) => {

  io = require("socket.io")(listener)

  io.on('connection', function (socket) {
    console.log('socket connection');    


    // new: this is called once when PlayerContainer mounts on client 
    // - limitation for now, player can only have one socket 
    
    socket.on('registerPlayer', async (data) => {
      console.log('registerPlayer');
      playerSockets[data.playerId] = socket.id;
      console.log(Object.keys(playerSockets))
    })

    // player requests to join a node

    socket.on('joinRoom', async function(data) {
      console.log("signup request for node " + data.nodeId);
      //console.log("current room for this socket: " + socket.room);
      
      joinRoom(data);

      /* OLD
      // check if socket already has a room
      if(socket.room) {
        if(socket.room != data.room) {
          console.log("socket already in another room " + socket.room + ", leaving...");
          await socket.leave(socket.room);
        }
      }
      // check if room should be changed
      if(socket.room != data.room || data.allowRejoin) {
        try {
          joinRoom(io, socket, data);
        } catch(error) {
          console.log(error);
        }
      }*/
    });

    // player leaves a node

    socket.on('leaveRoom', async function(data) {
      console.log("removing player from room " + data.nodeId + " - not implemented");

      let id = mongoose.Types.ObjectId(data.nodeId);
      let node = await RestHapi.find(RestHapi.models.scriptNode, id, {}, Log)
      /*if(node.multiPlayer) {
        socket.broadcast.in(socket.room).emit('message', {system: true, message: "a human left"});  
      }*/

      // TODO: run onLeave script

      
      /*OLD socket.leave(room);
      socket.room = null;
      */
      //socket.playerId = null;
    });

    // player input something
    
    socket.on("message", async (data)=>{
      console.log("socket message received", data);

      let id = mongoose.Types.ObjectId(data.node);
      let currentNode = await RestHapi.find(RestHapi.models.scriptNode, id, {}, Log)

      // echo input to other players in multiplayer mode 
      if(currentNode.multiPlayer && (data.message || data.attachment)) {
        let name = await db.getVar("player", {player: data.sender, project: data.project}, "name");
        
        let recipients = await db.getPlayersForNode(currentNode._id)
        recipients = recipients.filter((id)=>id != data.sender);

        //emitMessage(socket.broadcast.in(socket.room), 
        sendMessage(
          {...data, 
            label: name ? name : "unknown player", 
            recipients,
            node: currentNode._id, 
            board: currentNode.board
          });
      } else {
        // save incoming message
        db.logMessage({...data, 
          recipients: [data.sender], 
          node: currentNode._id, 
          board: currentNode.board,
          timestamp: Date.now()
        });
      }
      handleScript(currentNode, data.sender, "onMessage", data);

    });
  
  });

  // check for scheduled messages, deliver and inform connected players via socket
  
  const scheduleMessagesInterval = setInterval(async ()=>{
    let clients = Object.keys(io.sockets.sockets);

    let messages = await db.deliverScheduledMessages(RestHapi.models.message, Log)  
    
    for(let m of messages) {
    
      await sendMessage(m);
      
      /*
      // check if this message is for a connected client
      clients.forEach((key)=> {
        if(io.sockets.sockets[key].playerId) {
          let includes = false;
          for(let i = 0; i < m.recipients.length; i++) {
            if(m.recipients[i].toString() == io.sockets.sockets[key].playerId.toString()) 
              includes = true;
          }
          if(includes) {
            console.log("connected player found, emitting via socket");            
            
            //emitMessage(io.sockets.sockets[key], m);
          }
        }
      });*/
    
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
    
    if(result.outputs) {

      let recipients = await db.getPlayersForNode(node);
      
      // send off regular messages

      for(let i = 0; i < result.outputs.length; i++) {
        if(currentNode.multiPlayer) {
          //console.log("emitMessage socket.room", node);
          //emitInRoom(node, {...result.outputs[i], recipients, node, board, outputOrder: i});
          sendMessage({...result.outputs[i], recipients, node, board, outputOrder: i})
        } else {
          //emitMessage(socket, {...result.outputs[i], recipients: [playerId], node, board, outputOrder: i}); 
          sendMessage({...result.outputs[i], recipients: [playerId], node, board, outputOrder: i}); 
        }
      }
      // TODO: move scheduled output events to here 

      // send off interface commands

      if(result.interfaceCommand) {
        sendMessage({params: {
              interfaceCommand: result.interfaceCommand
            }, 
            recipients: [playerId], node, board});  
      }

      // handle moveTo requests

      if(result.moveTo) {

        // limit amount of chained moves
        let moveCounter = await db.getPlayerAttribute(playerId, "moveCounter");
        if(!moveCounter) {
          db.setPlayerAttribute(playerId, "moveCounter", 0);  
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
            console.log("moving player to room " + destination.name);
            if(destination._id != currentNode._id) {
              
              await db.setPlayerAttribute(playerId, "moveCounter", moveCounter+1)
              
              // inform others in the old room - todo: make more customizable 
              /*if(currentNode.multiPlayer) {
                io.in(socket.room).emit('message', {system: true, message: "a human left to " + newNode.name});   
              }*/

              // NEW: move player directly on backend
              setTimeout(()=>{

                if(!result.moveToOptions.all) {
                  // move single player to different node
                  joinRoom({playerId, nodeId: destination._id, execOnArrive: true});
                  // inform others in the new room - todo: make more customizable
                  /*if(currentNode.multiPlayer) {
                    socket.broadcast.in(socket.room).emit('message', {system: true, message: "a human arrived from " + currentNode.name});    
                  }*/
                } else {
                  // experimental:  move multiple players from one room to another
                  joinRoomMulti({fromNode: currentNode, toNode: destination, execOnArrive: true});
                }

              }, result.moveToOptions.delay ? result.moveToOptions.delay : 0);              

            } else {
              console.log("node " + result.moveToOptions.destination + " not found");
              sendMessage({
                message: "node " + result.moveToOptions.destination + " not found", 
                system: true, 
                recipients: [playerId],
                node, board
              });
            }
          }

        } else {

          console.log("too many moves, aborting")
            sendMessage({
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
    }
 
  });

}

