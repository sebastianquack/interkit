import * as io from 'socket.io-client';

let baseUrl = "/";

const initSocket = () => {

  let socket = io(baseUrl);

  socket.on('disconnect', function(){
    console.log("socket disconnect");
  });
  
  socket.on('connect', function(){
    console.log("socket connect");
  });
    
  socket.on('reconnect_attempt', () => {
    console.log("reconnect_attempt");  
  });

  return socket;

}

const key = {};

export { initSocket, key };