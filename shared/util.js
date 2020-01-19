import axios from 'axios';

export const getConfig = async (key) => {
  const res = await fetch("/api/config?key=" + key);
  const json = await res.json();
  //console.log(json);
  if(json.docs.length)
    return json.docs[0].value;
  else 
    return null;
}

const createPlayer = async () => {
  const res = await fetch("/api/player", {method: "post", body: "{}"});
  const json = await res.json();  
  console.log("new player created", json);
  return json;
}

export const findOrCreatePlayer = async () => {

  let player;
  let playerId = localStorage.getItem('playerId');
  console.log("playerId found", playerId);

  if(!playerId) {
    player = await createPlayer();
  } else {
    const res = await fetch("/api/player/" + playerId);
    player = await res.json();  
    console.log("player loaded", player);
    if(!player._id) {
      player = await createPlayer();
    }
  }

  if(player._id) {
    localStorage.setItem('playerId', player._id);
    return player._id;
  }

}

function getFileExtension (file) {
    const filenameParts = file.name.split('.')
    return filenameParts[filenameParts.length - 1].toLowerCase()
}

export const upload = async (file, progress) => {

  console.log(file);
  let fileType = file.type;
  let fileName = file.name;
  
  let response = await axios.post("/api/s3_sign", {
      fileName : fileName,
      fileType : fileType
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

  const res = await fetch("/api/file", {
      method: "post", 
      body: JSON.stringify([{
        filename: fileName,
        path: fileName
      }])
  });
  const json = await res.json();  
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