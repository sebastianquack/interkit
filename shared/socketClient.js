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

export const joinRoom = (room) => {
  socket.emit('joinRoom', room); // ask server to put us in a room
}

export const leaveRoom = (room) => {
  socket.emit('leaveRoom', room); // ask server to remove us from a room
}

export const listenForMessages = (callback) => {
  socket.on('message', callback);
}

export const stopListening = () => {
  socket.off('message');
}

export const emitMessage = (msg) => {
  socket.emit('message', {message: msg});
}

