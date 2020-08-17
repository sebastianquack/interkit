const boardKey = "tech-tests"
const nodeName = "hallo"
const projectId = "5f37f51aeda28edf494d3373"
const apiUrlPrefix = "http://localhost:9000"

require('source-map-support').install();
fetch = require('node-fetch');
const { initSocket, listenForMessages } =require('../shared/socketClient.js');
const { getConfig, findOrCreatePlayer, postPlayerMessage, loadNode, logPlayerToNode } =require('../shared/util.js');

const log = msg => console.log(msg)
const updateConnectionStatus = connected => { log( "socket " + connected ? "Connected" : "Disconnected") }
alert = msg => log("ALERT " + msg)


async function runTest() {

  const node = await loadNode(boardKey, nodeName, projectId, apiUrlPrefix)
  log("node loaded")
  const boardId = node.board
  const nodeId = node._id

  // create playerId
  playerId = await findOrCreatePlayer(null, apiUrlPrefix);

  await logPlayerToNode(playerId, nodeId, null, apiUrlPrefix)

  log(`created player ${playerId}`)
  await initSocket(playerId, updateConnectionStatus, apiUrlPrefix);
  
  listenForMessages(log)

  setTimeout(async ()=>{
    const msg = {
      sender: playerId,
      node: nodeId,
      board: boardId,
      project: projectId,
      params: null,
    }
    log("sending msg", msg)
    result = await postPlayerMessage(msg, apiUrlPrefix)
    log("result", result)
  }, 2000)
  
}

runTest()