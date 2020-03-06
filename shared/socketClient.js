import * as io from '../author/node_modules/socket.io-client';

import { getConfig, findOrCreatePlayer } from './util.js';

let socket = null;
let playerId;

export const getPlayerId = () => {
  return playerId;
}

export const initSocket = async () => {

  let socketURL = await getConfig("socketURL");

  socket = io(socketURL);

  socket.on('disconnect', function(){
    console.log("socket disconnect");
  });
  
  socket.on('connect', async function(){
    console.log("socket connect");
  });
    
  socket.on('reconnect_attempt', () => {
    console.log("reconnect_attempt");  
  });

  playerId = await findOrCreatePlayer();
}

// if socket or playerId isn't available yet, try again once after timeout - todo optimize
const reTry = (action) => {
  if(socket && playerId)
    action();
  else {
    console.log("no socket or playerId");
    setTimeout(()=>{
      console.log("trying second time");
      if(socket) 
        action();
      else 
        console.log("no socket or playerId, giving up");
    }, 2000);
  }
}

// ask server to put us in a room
export const joinRoom = (room, execOnArrive=true) => {
  console.log("joinRoom", room);
  reTry(()=>{
    socket.emit('joinRoom', {
      room, 
      playerId,
      execOnArrive
    }); 
  });
}

export const leaveRoom = (room) => {
  reTry(()=>{
    socket.off('message');
    socket.emit('leaveRoom', room); // ask server to remove us from a room
  });
}

export const listenForMessages = (callback) => {
  //console.log("listenForMessages");
  reTry(()=>{
    socket.off('message');
    socket.on('message', callback);
  });
}

export const stopListening = () => {
  reTry(()=>{
    socket.off('message');
  });
}

export const emitMessage = (msgData) => {
  console.log("emitting", msgData);
  reTry(()=>{
    socket.emit('message', {
      ...msgData,
      sender: playerId,
      seen: [playerId],
    });
  });
}

