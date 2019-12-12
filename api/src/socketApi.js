const RestHapi = require('rest-hapi')
const mongoose = require('mongoose');
const sandbox = require('./sandbox.js');

const Log = RestHapi.getLogger('socket');
let io = null;

async function joinRoom(io, socket, room) {
  console.log("joining " + room);
  await socket.join(room);
  
  // inform others in the new room 
  socket.room = room;
  
  console.log("trying to find this room in db");
  let id = mongoose.Types.ObjectId(room);
  let newNode = await RestHapi.find(RestHapi.models.scriptNode, id, {}, Log)
  
  if(newNode) {
    socket.emit('message', {system: true, message: "you are now in " + newNode.name});  
    socket.broadcast.in(socket.room).emit('message', {system: true, message: "a human arrived"});
    handleScript(io, socket, newNode, null);
  } else {
    console.log("room " + room + " not found!");
  }
  
}

exports.init = (listener) => {

  io = require("socket.io")(listener)

  io.on('connection', function (socket) {
    console.log('socket connection');    

    socket.on('joinRoom', async function(room) {
      console.log("signup request for room " + room);
      console.log("current room for this socket: " + socket.room);
      // check if socket already has a room
      if(socket.room) {
        if(socket.room != room) {
          console.log("socket already in another room " + socket.room + ", leaving...");
          await socket.leave(socket.room);
        }
      }
      // check if room needs to be changed
      if(socket.room != room) {
        try {
          joinRoom(io, socket, room);
        } catch(error) {
          console.log(error);
        }
      }
      
      });

    socket.on('leaveRoom', function(room) {
      console.log("removing socket from room " + room);
      socket.broadcast.in(socket.room).emit('message', {system: true, message: "a human left"});
      socket.leave(room);
      socket.room = null;
    });

    socket.on("message", async (data)=>{
      console.log("socket message", data);

      let id = mongoose.Types.ObjectId(socket.room);
      let currentNode = await RestHapi.find(RestHapi.models.scriptNode, id, {}, Log)
      handleScript(io, socket, currentNode, data.message);
    });
  
  });

} 

async function handleScript(io, socket, currentNode, msg) {

  sandbox.processMessage(msg, !msg ? currentNode.initScript : currentNode.responseScript, async (result)=>{
    if(result.error) {
      socket.emit('message', {system: true, message: result.error});
    }
    if(result.outputs) {
      if(result.moveTo) {
        if(!msg) {
          console.log("move on enter is not allowed");          
          socket.emit('message', {system: true, message: "preventing automatic move on entry"});
          return;
        }
        let newNode = await db.findNodeByName(result.moveTo);
        if(newNode) {
          console.log("moving player to room " + newNode.name);
          if(newNode.id != currentNode.id) {
            await socket.leave(socket.room);

            // inform others in the old room 
            io.in(socket.room).emit('message', {system: true, message: "a human left to " + newNode.name});   

            socket.room = newNode.id;
            await socket.join(newNode.id);
            // inform sender of new room
            socket.emit('message', {system: true, moveTo: newNode});
            socket.emit('message', {system: true, message: "you are now in " + newNode.name});

            // inform others in the new room 
            socket.broadcast.in(socket.room).emit('message', {system: true, message: "a human arrived from " + currentNode.name});    

            handleScript(io, socket, newNode, null);
          } 
        } else {
          console.log("node " + result.moveTo + " not found");
          socket.emit('message', {system: true, message: "node " + result.moveTo + " not found"});      
        }
      }
      for(let i = 0; i < result.outputs.length; i++) {
        io.in(socket.room).emit('message', result.outputs[i]);    
      }
      
    }
  });

}

