import axios from 'axios';
import { generateFilename, generateFileKey } from './common.js'

import { debounce } from "debounce";

/* CONFIGS */

export const getConfig = async (key) => {
  const res = await fetch("/api/config?key=" + key);
  if(!res.ok) {
    console.log("error fetching config ", key);
    return null;
  }
  const json = await res.json();
  //console.log(json);

  if(json.docs.length) {
    let value = json.docs[0].type == "number" ? parseFloat(json.docs[0].value) : json.docs[0].value;
    return value;
  }
  else 
    return null;
}


/* VARIABLES */

export const getPlayerVar = async (ids, key) => {
  const res = await fetch("/api/variable?varScope=player&key=" + key + "&player=" + ids.playerId + "&project=" + ids.projectId);
  if(!res.ok) {
    console.log("error fetching var ", key);
    return null;
  }
  const json = await res.json();
  //console.log(json);

  if(json.docs.length) {
    return json.docs[0].value
  }
  else 
    return null;
}

export const getProjectVar = async (ids, key) => {
  const res = await fetch("/api/variable?varScope=project&key=" + key + "&project=" + ids.projectId);
  if(!res.ok) {
    console.log("error fetching var ", key);
    return null;
  }
  const json = await res.json();
  //console.log(json);

  if(json.docs.length) {
    return json.docs[0].value
  }
  else 
    return null;
}

export const loadBoardVariable = async (boardKey, varKey, projectId) => {
  let board = await loadBoard(boardKey, projectId)
  if(!board) return null
  let query = {
    project: projectId,
    board: board._id,
    varScope: "board",
    key: varKey
  };
  let res = await fetch("/api/variable?$where=" + JSON.stringify(query));
  let json = await res.json();
  if(json.docs.length) return json.docs[0].value;
}

export const loadNodeVariable = async (boardKey, nodeName, varKey, projectId)=>{
  let node = await loadNode(boardKey, nodeName, projectId)
  if(!node) return null;
  let query = {
    project: projectId,
    node: node._id,
    varScope: "node",
    key: varKey
  };
  let res = await fetch("/api/variable?$where=" + JSON.stringify(query));
  let json = await res.json();
  if(json.docs.length) return json.docs[0].value;
}




/* PLAYERS */

const createPlayer = async () => {
  const res = await fetch("/api/player", {
    method: "POST", 
    headers: {
      'Content-Type': 'application/json'
    },    
    body: JSON.stringify({})
  });
  const json = await res.json();  
  console.log("new player created", json);
  return json;
}

export const removePlayerFromLocalStorage = () => {
  console.log("removing local storage playerId ", localStorage.getItem('playerId'));
  localStorage.setItem("playerId", null);
}

export const findOrCreatePlayer = async () => {

  let player;
  let playerId = localStorage.getItem('playerId');
  console.log("playerId found", playerId);

  if(!playerId || playerId == "null") {
    player = await createPlayer();
  } else {
    const res = await fetch("/api/player/" + playerId);
    if(res.ok) {
      player = await res.json();  
      console.log("player loaded", player);
      if(!player._id) {
        player = await createPlayer();
      }
    } else {
      console.log("error fetching player", res)
      alert("cannot find player on server, trying to create a new one...")
      player = await createPlayer();
    }
  }

  if(player && player._id) {
    persistPlayerId(player._id)    
    return player._id;
  }
}

export const persistPlayerId = (id) => {
  localStorage.setItem('playerId', id);
}

export const refreshPlayerId = async () => {
  removePlayerFromLocalStorage();
  let playerId = await findOrCreatePlayer();
  return playerId;
}



/* HELPERS PLAYERS, PROJECTS, NODES */

export const getCurrentNodeId = async (playerId, board) => {
  //console.log("getCurrentNode", playerId, board);
  let query = {
    player: playerId,
    board: board._id,
    timestamp: {$lt: Date.now()},
    scheduled: {$ne: true}
  }
  let limit = 1;
  let response = await fetch("/api/nodeLog?$sort=-timestamp&$limit="+limit+"&$where=" +  JSON.stringify(query));
  let nodes = await response.json();
  //console.log(nodes);
  if(nodes.docs.length)
    return nodes.docs[0].node
  else 
    return null
}


// find or create project log for given player and project (pass in ids)
export const logPlayerToProject = async (player, project) => {
  const res = await fetch("/api/projectLog?&player=" + player + "&project=" + project);
  const json = await res.json();  
  if(!json.docs.length) {
    const res2 = await fetch("/api/projectLog", {
      method: "post", 
      headers: {
        'Content-Type': 'application/json'
      },      
      body: JSON.stringify({player, project})});    
    // todo error handling
  }
}

export const loadBoard = async (boardKey, projectId)=> {
  let res = await fetch("/api/board?project=" + projectId + "&key=" + boardKey)
  let json = await res.json()
  if(json.docs.length) return json.docs[0]
}

export const loadNode = async (boardKey, nodeName, projectId)=> {
  let board = await loadBoard(boardKey, projectId)
  if(board) {
    let res = await fetch("/api/scriptNode?board=" + board._id + "&name=" + nodeName)
    let json = await res.json()
    return json.docs[0]
  }
}



/* MESSAGES */

export const postPlayerMessage = debounce(async (msgData) => {
  msgData.seen = [msgData.sender] // add seen 
  console.log("postPlayerMessage", msgData);
  let response = await fetch("/api/player/message", {
    method: "POST",
    body: JSON.stringify(msgData)
  })
  let responseJSON = {};
  if(response.ok)
    responseJSON = await response.json();
  if(!response.ok || !responseJSON || !responseJSON.status == "ok") alert("warning: message was not received and processed correctly on the server");
  return responseJSON.status == "ok";
}, 500, true)

export const postAdminMessage = async (msgData) => {
  console.log("postAdminMessage", msgData);
  let response = await fetch("/api/player/adminMessage", {
    method: "POST",
    body: JSON.stringify(msgData)
  })
  let responseJSON = {};
  if(response.ok)
    responseJSON = await response.json();
  if(!response.ok || !responseJSON || !responseJSON.status == "ok") alert("warning: admin message was not received and processed correctly on the server");
  return responseJSON.status == "ok";  
} 




/* FILES */

function getFileExtension (file) {
    const filenameParts = file.name.split('.')
    return filenameParts[filenameParts.length - 1].toLowerCase()
}

export const upload = async (file, progress, projectId = null, authored = false) => {

  // TODO server side mime type detection? https://stackoverflow.com/questions/1201945/how-is-mime-type-of-an-uploaded-file-determined-by-browser

  console.log("UTIL", file);
  let fileType = file.type;
  let fileName = generateFilename()
  
  let response = await axios.post("/api/s3_sign", {
      fileName,
      fileType
  });
  if(!response) return null;
  console.log(response);

  var returnData = response.data.data.returnData;
  var signedRequest = returnData.signedRequest;
  
  console.log("Recieved a signed request " + signedRequest);
  
  let options = {
      headers: {
        'Content-Type': fileType
      },
      onUploadProgress: e => {
        if (e.lengthComputable) {
           progress(Math.round((e.loaded * 100) / e.total))
        }
      }
    };
  
  let uploadResponse = await axios.put(signedRequest, file, options)
  console.log("Response from s3", uploadResponse);

  if (!projectId) {
    console.warn(`upload lacked project: ${fileName}`)
  }

  const entry = {
    key: generateFileKey(),
    name: file.name,
    uploadedFilename: file.name,
    filename: fileName,
    mimetype: fileType,
    simpletype: fileType && fileType.indexOf("/") > 0 ? fileType.split("/")[0] : "",
    path: fileName,
    project: projectId,
    authored
  }

  //console.log(entry)

  const res = await fetch("/api/file", {
      method: "post", 
      headers: {
        'Content-Type': 'application/json'
      },      
      body: JSON.stringify([entry])
  });
  const json = await res.json();  // -> array of objects
  console.log("new file created", json);
  return json;
}

export const deleteFile = async (file, token) => {
  let response = await fetch("/api/file/" + file._id, {
    method: "DELETE",
    headers: {'authorization': token}
  });
  console.log(response);

  response = axios.post("/api/s3_delete", {
      fileName : file.filename
  }, {headers: {authorization: `${token}`}})
  console.log(response);
}

export const getFilenameForFilekey = async (key) => {

  let res = await fetch("/api/file" + "?key=" + key)
  const json = await res.json()
  console.log(json);

  if(json.docs)
    return json.docs[0].filename

}
