const RestHapi = require('rest-hapi')
const mongoose = require('mongoose');
const sandbox = require('./sandbox.js');

const db = require('./dbutil.js');

const Log = RestHapi.getLogger('socket');
Log.logLevel = 'WARNING';


let io = null;

const emitMessage = async (emitter, data) => {
  let msgData = {...data, timestamp: Date.now()};
  if(!msgData.params) msgData.params = {};
  
  let id = data._id;
  if(!id) {
    let m = await db.logMessage(msgData);
    id = m._id;
  }
  emitter.emit('message', {...msgData, _id: id});         
}

const emitInRoom = async (room, data) => {
  let msgData = {...data, timestamp: Date.now()};
  if(!msgData.params) msgData.params = {};
  
  let m = await db.logMessage(msgData);
  io.in(room).emit('message', {...msgData, _id: m._id});         

}

async function joinRoom(io, socket, data) {
  console.log("joining " + data.room);
  await socket.join(data.room);
  
  socket.room = data.room;
  socket.playerId = data.playerId;
  
  console.log("trying to find this room in db");
  let id = mongoose.Types.ObjectId(data.room);
  let newNode = await RestHapi.find(RestHapi.models.scriptNode, id, {}, Log)

  await db.logPlayerToNode(data.playerId, newNode);
  
  //console.log(newNode);
  if(newNode) {
    //socket.emit('message', {system: true, message: "you are now in " + newNode.name});  
    /*if(newNode.multiPlayer) {
      socket.broadcast.in(socket.room).emit('message', {system: true, message: "a human arrived"});
    }*/
    if(data.execOnArrive)
      handleScript(io, socket, newNode, data.playerId, "onArrive");
  } else {
    console.log("room " + data.room + " not found!");
  }
  
}

const getPlayerIdsForRoom = async (roomName) => {
  let playerIds = [];
  
  let clients = io.sockets.adapter.rooms[roomName].sockets;   
  for (let clientId in clients ) {
     //this is the socket of each client in the room.
     let clientSocket = io.sockets.connected[clientId];
     playerIds.push(clientSocket.playerId);
  }

  console.log("playerIds", playerIds);

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

exports.init = (listener) => {

  io = require("socket.io")(listener)

  io.on('connection', function (socket) {
    console.log('socket connection');    

    socket.on('joinRoom', async function(data) {
      console.log("signup request for room " + data.room);
      console.log("current room for this socket: " + socket.room);
      // check if socket already has a room
      if(socket.room) {
        if(socket.room != data.room) {
          console.log("socket already in another room " + socket.room + ", leaving...");
          await socket.leave(socket.room);
        }
      }
      // check if room needs to be changed
      if(socket.room != data.room || data.allowRejoin) {
        try {
          joinRoom(io, socket, data);
        } catch(error) {
          console.log(error);
        }
      }
    });

    socket.on('leaveRoom', async function(room) {
      console.log("removing socket from room " + room);

      let id = mongoose.Types.ObjectId(room);
      let node = await RestHapi.find(RestHapi.models.scriptNode, id, {}, Log)
      /*if(node.multiPlayer) {
        socket.broadcast.in(socket.room).emit('message', {system: true, message: "a human left"});  
      }*/
      
      socket.leave(room);
      socket.room = null;
      //socket.playerId = null;
    });

    // this is when user inputs something
    socket.on("message", async (data)=>{
      console.log("socket message received", data);

      let id = mongoose.Types.ObjectId(socket.room);
      let currentNode = await RestHapi.find(RestHapi.models.scriptNode, id, {}, Log)

      // echo input to other players in multiplayer mode
      if(currentNode.multiPlayer && (data.message || data.attachment)) {
        let name = await db.getVar("player", {playerId: data.sender}, "name");
        emitMessage(socket.broadcast.in(socket.room), 
          {...data, 
            label: name ? name : "unknown player", 
            recipients: await db.getPlayersForNode(socket.room),
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
      handleScript(io, socket, currentNode, data.sender, "onMessage", data);

    });
  
  });

  // check for scheduled messages, deliver and inform connected players via socket
  const scheduleMessagesInterval = setInterval(async ()=>{
    let clients = Object.keys(io.sockets.sockets);

    // just a ping to test sockets
    /*clients.forEach((key)=>{
      io.sockets.sockets[key].emit('message', {status: "ping"});         
    })*/
    
    let messages = await db.deliverScheduledMessages(RestHapi.models.message, Log)  
    messages.forEach((m)=>{
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
            emitMessage(io.sockets.sockets[key], m);
          }
        }
      });
    })
  }, 10000);

} 

async function handleScript(io, socket, currentNode, playerId, hook, msgData) {

  let node = currentNode._id;
  let board = currentNode.board;

  sandbox.run(currentNode, playerId, hook, msgData, async (result)=>{
    if(result.error) {
      emitMessage(socket, {
        message: result.error, 
        system: true, 
        recipients: [playerId],
        node, board
      });
    }
    if(result.outputs) {

      let recipients = await db.getPlayersForNode(socket.room);
      for(let i = 0; i < result.outputs.length; i++) {
        if(currentNode.multiPlayer) {
          console.log("emitMessage socket.room", socket.room);
          emitInRoom(socket.room, {...result.outputs[i], recipients, node, board});
        } else {
          emitMessage(socket, {...result.outputs[i], recipients: [playerId], node, board}); 
        }
      }

      if(result.interfaceCommand) {
        emitMessage(socket, {params: {
              interfaceCommand: result.interfaceCommand
            }, 
            recipients: [playerId], node, board});  
      }

      if(result.moveTo) {
        
        let newNodes = await RestHapi.list(RestHapi.models.scriptNode, {
          name: result.moveTo,
          board: currentNode.board
        }, Log)
        //console.log(newNodes);
        
        if(newNodes.docs.length == 1) {
          let newNode = newNodes.docs[0];
          console.log("moving player to room " + newNode.name);
          if(newNode._id != currentNode._id) {
            
            
            // inform others in the old room  
            /*if(currentNode.multiPlayer) {
              io.in(socket.room).emit('message', {system: true, message: "a human left to " + newNode.name});   
            }*/

            // tell sender to move to new room
            console.log("emit moveTo message");
            await emitMessage(socket, {system: true, params: {
              moveTo: newNode._id,
              moveToDelay: result.moveToDelay,
            }, 
            recipients: [playerId], node, board});

            /* experimental
            if(result.moveToAll) {
              let recipients = await db.getPlayersForNode(currentNode._id);
              await emitInRoom(currentNode._id, {system: true, params: {
                moveTo: newNode._id,
                moveToDelay: result.moveToDelay,
            }, 
            recipients: recipients, node, board});
            */
    
            // inform others in the new room 
            /*if(currentNode.multiPlayer) {
              socket.broadcast.in(socket.room).emit('message', {system: true, message: "a human arrived from " + currentNode.name});    
            }*/
            //handleScript(io, socket, newNode, playerId, "onArrive");
        
          } else {
            console.log("node " + result.moveTo + " not found");
            emitMessage(socket, {
              message: "node " + result.moveTo + " not found", 
              system: true, 
              recipients: [playerId],
              node, board
            });
          }
        }
      }
    }
 
  });

}

