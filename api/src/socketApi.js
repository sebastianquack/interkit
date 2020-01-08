const RestHapi = require('rest-hapi')
const mongoose = require('mongoose');
const sandbox = require('./sandbox.js');

const db = require('./dbutil.js');

const Log = RestHapi.getLogger('socket');
Log.logLevel = 'WARNING';


let io = null;

const emitMessage = (emitter, data) => {
  console.log("emitting", data);
  emitter.emit('message', {...data, timestamp: Date.now()});         
}

async function joinRoom(io, socket, room, playerId) {
  console.log("joining " + room);
  await socket.join(room);
  
  // inform others in the new room 
  socket.room = room;
  
  console.log("trying to find this room in db");
  let id = mongoose.Types.ObjectId(room);
  let newNode = await RestHapi.find(RestHapi.models.scriptNode, id, {}, Log)
  
  //console.log(newNode);
  if(newNode) {
    //socket.emit('message', {system: true, message: "you are now in " + newNode.name});  
    /*if(newNode.multiPlayer) {
      socket.broadcast.in(socket.room).emit('message', {system: true, message: "a human arrived"});
    }*/
    handleScript(io, socket, newNode, playerId, "onArrive");
  } else {
    console.log("room " + room + " not found!");
  }
  
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
          joinRoom(io, socket, data.room, data.playerId);
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
    });

    socket.on("message", async (data)=>{
      console.log("socket message", data);

      let id = mongoose.Types.ObjectId(socket.room);
      let currentNode = await RestHapi.find(RestHapi.models.scriptNode, id, {}, Log)

      // echo input to other players in multiplayer mode
      if(currentNode.multiPlayer && data.message) {
        let name = await db.getVar("player", {playerId: data.playerId}, "name");
        emitMessage(socket.broadcast.in(socket.room), {text: data.message, label: name ? name : "unknown player"});
      }
      handleScript(io, socket, currentNode, data.playerId, "onMessage", data.message);
    });
  
  });

} 

async function handleScript(io, socket, currentNode, playerId, hook, msg=null) {

  sandbox.run(currentNode, playerId, hook, msg, async (result)=>{
    if(result.error) {
      emitMessage(socket, {text: result.error, system: true});
    }
    if(result.outputs) {

      for(let i = 0; i < result.outputs.length; i++) {
        if(currentNode.multiPlayer) {
          emitMessage(io.in(socket.room), result.outputs[i]);
        } else {
          emitMessage(socket, result.outputs[i]); 
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
            emitMessage(socket, null, {system: true, moveTo: newNode});
            //socket.emit('message', {system: true, message: "you are now in " + newNode.name});

            // inform others in the new room 
            /*if(currentNode.multiPlayer) {
              socket.broadcast.in(socket.room).emit('message', {system: true, message: "a human arrived from " + currentNode.name});    
            }*/

            handleScript(io, socket, newNode, playerId, "onArrive");
          } 
        } else {
          console.log("node " + result.moveTo + " not found");
          emitMessage(socket, {text: "node " + result.moveTo + " not found", system: true});
        }
      }
 
    }
  });

}

