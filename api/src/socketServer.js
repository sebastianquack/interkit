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
  
  let m = await db.logMessage(msgData);
  emitter.emit('message', {...msgData, _id: m._id});         
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
  
  // inform others in the new room 
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
      if(socket.room != data.room) {
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
      socket.playerId = null;
    });

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


      // maybe todo here: add connected bots -> check if bots are connected and on what node, handleSscript
    });
  
  });

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
            await socket.leave(socket.room);

            // inform others in the old room 
            /*if(currentNode.multiPlayer) {
              io.in(socket.room).emit('message', {system: true, message: "a human left to " + newNode.name});   
            }*/
            
            socket.room = newNode._id;
            await socket.join(newNode._id);
            // inform sender of new room
            console.log("emit moveTo message");
            emitMessage(socket, {system: true, params: {moveTo: newNode._id}, recipients: [playerId], node, board});
            //socket.emit('message', {system: true, message: "you are now in " + newNode.name});

            // inform others in the new room 
            /*if(currentNode.multiPlayer) {
              socket.broadcast.in(socket.room).emit('message', {system: true, message: "a human arrived from " + currentNode.name});    
            }*/

            //handleScript(io, socket, newNode, playerId, "onArrive");
          } 
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
  });

}

