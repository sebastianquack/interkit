import * as io from '../author/node_modules/socket.io-client';

import { getConfig } from './util.js';

let socket = null;
let connectedCallback = null;

export const doWhenConnected = (callback) => {
  if(socket && socket.connected) {
    callback();
  } else {
    console.log("no socket connection yet, saving callback")
    connectedCallback = callback;  
  }
}

export const initSocket = async (playerId, updateConnectionStatus) => {

  let socketURL = await getConfig("socketURL");
  if(!socketURL) {
    alert("coult not connect to server, try again later")
    return;
  }

  socket = io(socketURL);

  socket.on('disconnect', function(){
    if(confirm("Socket-Verbindung verloren (disconnect). Seite neu laden?")) {
       location.reload(); 
    }
    console.log("socket disconnect");
    if(updateConnectionStatus) updateConnectionStatus(socket.connected);
  });

  socket.on('connect_timeout', function(){
    if(confirm("Socket-Verbindung verloren (connect_timeout). Seite neu laden?")) {
       location.reload(); 
    }
    console.log("socket connect_timeout");    
  });
  
  socket.on('connect', async function(){
    console.log("socket connect");
    registerPlayer(playerId);
    if(connectedCallback) connectedCallback();
    if(updateConnectionStatus) updateConnectionStatus(socket.connected);
  });
    
  socket.on('reconnect_attempt', () => {
    console.log("reconnect_attempt");  
  });
}

// registers a player to a socket connection
export const registerPlayer = (playerId) => {
  console.log("registerPlayer", playerId);
  socket.emit('registerPlayer', {playerId});
}

// sets up handler for incoming socket messages
export const listenForMessages = (callback) => {
  socket.off('message');
  socket.on('message', callback);
}



/* deprecated
// ask server to log us into a node. called in rare circumstances:
// - when board is opened for the first time by a player
// - when player clicks a button on an item
// - when manually moving to a node from authoring

export const joinNode = (playerId, nodeId, execOnArrive=true, allowRejoin=false, arriveFrom=null) => {
  console.log("joinNode", nodeId);
  console.log("socket.connected? ", socket.connected);
  socket.emit('joinNode', {
    nodeId, 
    playerId,
    execOnArrive,
    allowRejoin,
    arriveFrom
  }); 
}

export const leaveNode = (playerId, nodeId) => {
  socket.emit('leaveNode', {playerId, nodeId}); // ask server to remove us from a room
}
*/

/* deprecated
export const emitMessage = (msgData) => {
  console.log("emitting", msgData);
  socket.emit('message', msgData);
}
*/

