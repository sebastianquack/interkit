<script>

import { token } from './stores.js';  
import { getPlayerVar } from '../../shared/util.js'

import { onMount } from 'svelte'

export let projectId;
export let playerId;
export let dropConnectedPlayerId;
export let setPlayerId;

let nodeLogs = [];
let projectLogs = [];
let playerInfo = {}

const loadPlayers = async ()=>{
    console.log("loading players for project", projectId);
    
    const res = await fetch("/api/projectLog?project=" + projectId + "&$sort=-createdAt");
    const json = await res.json();
    if(json.docs) {
      projectLogs = json.docs;
    }

    projectLogs.forEach(async pl=>{
      playerInfo[pl.player] = await loadPlayerInfo(pl.player)
    })
}  

const loadPlayerInfo = async (id)=>{
  let name = await getPlayerVar({playerId: id, projectId}, "name")
  return name
}

$: {
  if(projectId) loadPlayers();
}

const attachPlayer = (id) => {
  setPlayerId(id);
}

const deletePlayer = async(id)=>{
  if(confirm("permanently delete player?")) {
    const res = await fetch("/api/player/" + id, {method: "DELETE", headers: {'authorization': $token}});
    if(id == playerId) dropConnectedPlayerId();
    loadPlayers();
  }
}

</script>

<div class="scroll-container">

<h3>players <button on:click={loadPlayers}>reload</button></h3> 

<!--ul>
  {#each nodeLogs as nl}
  <li>{nl.player} {nl.board.name}/{nl.node.name} {nl.player == playerId ? "(active)" : ""} <button on:click={()=>deletePlayer(nl.player)}>delete player</button></li>
  {/each}
</ul-->

<ul>
  {#each projectLogs as pl}
  <li><b>{playerInfo[pl.player]}</b> {pl.player} {pl.player == playerId ? "(attached)" : ""} <button on:click={()=>attachPlayer(pl.player)}>attach</button>&nbsp;<button on:click={()=>deletePlayer(pl.player)}>delete</button></li>
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