import * as io from '../author/node_modules/socket.io-client';

import { getConfig } from './util.js';

let socket = null;

export const initSocket = async () => {

  let socketURL = await getConfig("socketURL");

  socket = io(socketURL);

  socket.on('disconnect', function(){
    console.log("socket disconnect");
  });
  
  socket.on('connect', function(){
    console.log("socket connect");
  });
    
  socket.on('reconnect_attempt', () => {
    console.log("reconnect_attempt");  
  });

}

const doubleTry = (action) => {
  if(socket)
    action();
  else {
    console.log("no socket");
    setTimeout(()=>{
      console.log("trying second time");
      if(socket) 
        action();
      else 
        console.log("no socket, giving up");
    }, 2000);
  }
}

export const joinRoom = (room) => {
  doubleTry(()=>{
    socket.emit('joinRoom', room); // ask server to put us in a room
  });
}

export const leaveRoom = (room) => {
  doubleTry(()=>{
    socket.emit('leaveRoom', room); // ask server to remove us from a room
  });
}

export const listenForMessages = (callback) => {
  doubleTry(()=>{
    socket.on('message', callback);
  });
}

export const stopListening = () => {
  doubleTry(()=>{
    socket.off('message');
  });
}

export const emitMessage = (msg) => {
  doubleTry(()=>{
    socket.emit('message', {message: msg});
  });
}

