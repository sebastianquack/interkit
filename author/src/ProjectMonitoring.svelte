<script>

import { token } from './stores.js';  
import { getPlayerVar, getFilenameForFilekey, getConfig } from '../../shared/util.js'

export let projectId;
export let playerId;
export let setPlayerId;

const attachPlayer = (id) => {
  setPlayerId(id);
}

let fileServerURL;
let items = [];
let audioCollections = {}
let textCollections = {}
let messages = {}

const loadItems = async ()=>{
  let res = await fetch("/api/item?project=" + projectId + "&authored=false&$sort=-updatedAt")
  let json = await res.json()
  items = json.docs;    
}  

const loadBoard = async (boardKey)=> {
  let res = await fetch("/api/board?project=" + projectId + "&key=" + boardKey)
  let json = await res.json()
  if(json.docs.length) return json.docs[0]
}

const loadNode = async (boardKey, nodeName)=> {
  let board = await loadBoard(boardKey)
  if(board) {
    let res = await fetch("/api/scriptNode?board=" + board._id + "&name=" + nodeName)
    let json = await res.json()
    return json.docs[0]
  }
}

const loadBoardVariable = async (boardKey, varKey) => {
  let board = await loadBoard(boardKey)
  let query = {
    project: projectId,
    board: board._id,
    varScope: "board",
    key: varKey
  };
  let res = await fetch("/api/variable?$where=" + JSON.stringify(query));
  let json = await res.json();
  if(json.docs.length) return json.docs[0];
}

const loadNodeVariable = async (boardKey, nodeName, varKey)=>{
  let node = await loadNode(boardKey, nodeName)
  let query = {
    project: projectId,
    node: node._id,
    varScope: "node",
    key: varKey
  };
  let res = await fetch("/api/variable?$where=" + JSON.stringify(query));
  let json = await res.json();
  if(json.docs.length) return json.docs[0];
}

const loadAudioCollection = async (nodeName, collectionName = "audioLibrary") => {
  let v = await loadNodeVariable("odyssee", nodeName, collectionName)  
  console.log(v.value)

  for(let i = 0; i < v.value.length; i++) {
    let entry = v.value[i];
    if(entry && entry.filename)
      entry.audioSrc = await getFilenameForFilekey(entry.filename)
  }
  audioCollections[nodeName + "/" + collectionName] = v.value
}

const loadTextCollection = async (boardKey, nodeName, collectionName) => {
  let v = await loadNodeVariable(boardKey, nodeName, collectionName)

  for(let i = 0; i < v.value.length; i++) {
    v.value[i] = await formatTextEntry(v.value[i])
  }
  
  if(v.value)  
    textCollections[boardKey + "/" + nodeName + "/" + collectionName] = v.value
}

const formatTextEntry = async (entry) => {
  if(typeof entry == "string") {
    return {text: entry}
  }

  try {
  if(entry.input) {
    return {
      text: entry.input.message ? entry.input.message : "",
      audioSrc: entry.input.attachment.mediatype == "audio" ? entry.input.attachment.audioSrc : undefined,
      playerId: entry.input.msgData.sender
    }
  }
  } catch(e) {
    console.log(e)
    return {text: JSON.stringify(entry)}
  }

}

const loadMessages = async (boardKey)=>{
  let board = await loadBoard(boardKey)

  let res = await fetch("/api/message?"
    + "board=" + board._id
    + "&$limit=100&$sort=-createdAt"
  );
  let json = await res.json();

  messages[boardKey] = json.docs
}

const loadData = async () => {
  fileServerURL = await getConfig("fileServerURL");

  await loadItems();
  await loadAudioCollection("intro", "audioLibrary")
  await loadAudioCollection("zyklopen-5", "odysseus")
  await loadTextCollection("odyssee", "kikonen-3", "feelings")

  let dreamCounter = await loadBoardVariable("elanaveva", "dreamCounter")
  if(dreamCounter) {
    console.log("dreamCounter", dreamCounter.value)
    for(let i = 0; i <= dreamCounter.value; i++) {
      await loadTextCollection("elanaveva", "speisesaal", "history-" + i)
    }
  }

  await loadMessages("dryland")
  await loadMessages("support")

  console.log(messages)

}

$: {
  if(projectId && playerId) loadData();
}

</script>

<div class="scroll-container">

<h3>project monitoring <button on:click={loadData}>reload</button></h3> 

<h4>Islands</h4>
<ul>
  {#each items as item}
    <li>
      {#if item.value && item.value.history}
        <b>{item.value.name}</b> <small>{item.key}</small><br>
          {#if item.value.monument}
         monument: {item.value.monument.description} aus {item.value.monument.components} von {item.value.monument.builder}
         {/if}
          <br>history:
          <ul>
           {#each item.value.history as entry}
              <li>
                {entry.text}
                {#if entry.playerId}
                  <button on:click={()=>attachPlayer(entry.playerId)}>attach</button>        
                {/if}
              </li>
           {/each}
         </ul>
         <br>
         
      {/if}
    </li>
  {/each}
</ul>

<h4>Audio Collections</h4>
<ul>
  {#each Object.keys(audioCollections) as libKey}
    <li>
      {libKey}
      {#if audioCollections[libKey]}
        <ul>
        {#each audioCollections[libKey] as entry}
          <li>
          {#if entry}
              {entry.label}
              {entry.playerId}
              <audio controls>
                <source src={encodeURI(fileServerURL + entry.audioSrc)} type={"audio/mp3"}>
              </audio>
              <button on:click={()=>attachPlayer(entry.playerId)}>attach</button>        
          {:else}            
            not recorded
          {/if}
          </li>
        {/each}
        </ul>
      {/if}
    </li>
  {/each}
</ul>

<h4>Text Collections</h4>
<ul>
  {#each Object.keys(textCollections) as libKey}
    <li>
      {libKey}
      {#if textCollections[libKey]}
        <ul>
        {#each textCollections[libKey] as entry}
          <li>
            {entry.text}
            {#if entry.audioSrc}
            <audio controls>
                <source src={encodeURI(entry.audioSrc)} type={"audio/mp3"}>
              </audio> 
            {/if}
            {#if entry.playerId}
            <button on:click={()=>attachPlayer(entry.playerId)}>attach</button>        
            {/if}

          </li>
        {/each}
        </ul>
      {/if}
    </li>
  {/each}
</ul>

<h4>Messages</h4>
<ul>
  {#each Object.keys(messages) as libKey}
    <li>
      {libKey}
      {#if messages[libKey]}
        <ul>
        {#each messages[libKey] as entry}
          {#if entry.message && entry.sender}
          <li>
            {entry.message} <small>{entry.sender}<small> &nbsp;<button on:click={()=>attachPlayer(entry.sender)}>attach</button>                    
          </li>
          {/if}
        {/each}
        </ul>
      {/if}
    </li>
  {/each}
</ul>




</div>

<style>

  .scroll-container {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    padding-left: 10px;
    box-sizing: border-box;
    overflow: scroll;
    width: 100%;
    background-color: #fff;
  }


</style>