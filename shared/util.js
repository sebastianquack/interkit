
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

