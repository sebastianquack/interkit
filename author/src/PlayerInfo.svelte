<script>

import { token } from './stores.js';  

import VarList from './VarList.svelte';

export let playerId;
export let playerNodeId;
export let clearPlayerId;

export let close;

let nodeLogs = {};

const loadInfo = async ()=>{
    console.log("loading player info for", playerId);
    const res = await fetch("/api/nodeLog/" + playerId + "/getHistory");
    const json = await res.json();
    console.log(json);
    nodeLogs = json;
}  

$: {
  if(playerId) loadInfo();
}

const deletePlayer = async()=>{
  if(confirm("permanently delete player?")) {
    const res = await fetch("/api/player/" + playerId, {method: "DELETE", headers: {'authorization': $token}});
    clearPlayerId(playerId);
  }
}

</script>

<div class="info-container">

  <button class="close" on:click={close}>close</button>

  <h3>player {playerId}</h3>

  <ul> 
  {#each Object.keys(nodeLogs) as key}
    <li>{nodeLogs[key][0].board.name}:
    {#each nodeLogs[key] as nl}
      {#if nl.node}
        <span class="nl">{nl.node.name}</span> 
      {/if}
    {/each}
    </li>
  {/each}
  </ul>
  
  
  <VarList
    scope="player"
    ids={{player: playerId}}
  />

  <VarList
    scope="playerNode"
    ids={{player: playerId}}
  />

  <button on:click={deletePlayer}>delete player</button>

</div>


<style>

  .info-container {
    position: absolute;
    left: 0;
    top: 0;
    z-index: 200;
    width: 100%;
    height: 100%;
    background-color: #fff;
    padding: 10px;
    overflow-y: scroll;
    box-sizing: border-box;
  }

  button.close {
    position: absolute;
    top: 10px;
    right: 10px;
  }

  span.nl {
    margin-right: 0.5em;
  }

</style>