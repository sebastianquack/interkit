<script>

import { onMount } from 'svelte';
import { token } from './stores.js';  
import { getPlayerVar, getConfig, loadBoard, loadBoardVariable, loadNodeVariable, getProjectVar } from '../../shared/util.js'

import Island from './monitoring/Island.svelte'
import Messages from './monitoring/Messages.svelte'
import TextCollection from './monitoring/TextCollection.svelte'
import AudioCollection from './monitoring/AudioCollection.svelte'

export let projectId;
export let playerId;
export let setPlayerId;

const attachPlayer = (id) => {
  setPlayerId(id);
}


let boardStats = {}
const loadBoardStats = async  () => {
  
  let res = await fetch("/api/board?project=" + projectId + "&$sort=order")  
  let boardsJSON = await res.json()
  console.log(boardsJSON)

  for(let board of boardsJSON.docs) {

    // get boardlogs for this board
    let res = await fetch("api/boardLog?board=" + board._id + "&project=" + projectId)
    let json = await res.json()

    // count unique players
    let countObj = {};
    let counter = 0;
    for (let i = 0; i < json.docs.length; i++)
      if(!countObj[json.docs[i].player] && json.docs[i].currentNode) counter++;

    boardStats[board.name] = counter
  }  
}


let dreams = []
const loadDreams = async () => {
  reset()
  let dreamCounter = await loadBoardVariable("elanaveva", "dreamCounter", projectId)
  dreams = [];
  console.log("dreamCounter", dreamCounter)
  for(let i = dreamCounter > 0 ? dreamCounter - 1 : 0; i <= dreamCounter; i++) {
    const scenes = ["speisesaal", "kueche", "maschinenraum", "deck", "laderaum", "kaminzimmer", "bruecke"]
    for(let scene of scenes) {
      let entries = await loadNodeVariable("elanaveva", scene, "history-" + i, projectId)
      dreams.push({
        key: scene + "/history-" + i,
        entries
      })
    }
  }
  dreams = dreams;
}

let audioCollections = []
const loadAudioCollections = async () => {
  reset()
  const collections = await getProjectVar({projectId}, "monitoringAudioCollections")
  console.log(collections)
  for(let c of collections) {
    let v = await loadNodeVariable(c.board ? c.board : "odyssee", c.node, c.collectionName, projectId)  
    console.log(v)
      audioCollections.push({
        key: c.node + "/" + c.collectionName,
        entries: v
      })
    
  }
  audioCollections = audioCollections
  console.log(audioCollections)
}

let textCollections = []
const loadTextCollections = async () => {
  reset()
  const collections = await getProjectVar({projectId}, "monitoringTextCollections")
  console.log(collections)
  for(let c of collections) {
    let v = await loadNodeVariable(c.board, c.node, c.collectionName, projectId)  
    console.log(v)
      textCollections.push({
        key: c.node + "/" + c.collectionName,
        entries: v
      })
  }
  textCollections = textCollections
  console.log(textCollections)
}

let islandItems = []
const loadItems = async ()=>{
  reset()
  let res = await fetch("/api/item?project=" + projectId + "&authored=false&$sort=-updatedAt")
  let json = await res.json()
  islandItems = json.docs;    
}

let messages = []
let messagesBoardKey;
const loadMessages = async (boardKey)=>{
  reset()
  messagesBoardKey = boardKey
  let board = await loadBoard(boardKey, projectId)
  let res = await fetch("/api/message?"
    + "board=" + board._id
    + "&$limit=100&$sort=-createdAt"
    + "&$where= " + JSON.stringify({recipients: {$size: 0}})
  );
  let json = await res.json();
  messages = json.docs
}

const reset = ()=>{
  messages = [];
  islandItems = [];
  audioCollections = [];
  textCollections = [];
  dreams = [];
}

let playerCounter
onMount(async ()=>{
  playerCounter = await getProjectVar({projectId}, "playerCounter");
  await loadBoardStats()
})


</script>

<div class="scroll-container">

  <h3>project monitoring</h3> 

  <p>playerCounter: {playerCounter}</p>

  <ul>
  {#each Object.keys(boardStats) as boardKey}
    <li>{boardKey}: {boardStats[boardKey]}</li>
  {/each}
  </ul>

  <button on:click={()=>loadMessages("support")}>load support</button>  
  <button on:click={loadItems}>load islands</button>
  <button on:click={loadAudioCollections}>load audio collections</button>
  <button on:click={loadTextCollections}>load text collections</button>
  <button on:click={loadDreams}>load dreams</button>
  <button on:click={()=>loadMessages("dryland")}>load dryland</button>
  

  
  {#if islandItems.length}
  <h4>Inseln</h4>
  <ul>
    {#each islandItems as item}
      {#if item.value.history}
        <li><Island {item} {projectId} {playerId} {attachPlayer} /></li>
      {/if}
    {/each}
  </ul>
  {/if}

  <Messages {messages} {messagesBoardKey} {attachPlayer}/>

  {#if dreams.length} 
    <h4>Dreams</h4>
    {#each dreams as collection}
      <TextCollection {collection} {attachPlayer}/>
    {/each}
  {/if}

  {#if audioCollections.length} 
    <h4>Audio Collections</h4>
    {#each audioCollections as collection}
      <AudioCollection {collection} {attachPlayer}/>
    {/each}
  {/if}

  {#if textCollections.length} 
    <h4>Text Collections</h4>
    {#each textCollections as collection}
      <TextCollection {collection} {attachPlayer}/>
    {/each}
  {/if}

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