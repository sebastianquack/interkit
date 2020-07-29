<script>

//import { token } from './stores.js';  

import VarList from '../../author/src/VarList.svelte';

export let playerId;
export let socketConnectionStatus;
export let close;
export let authoring;
export let projectId;

let nodeLogs = {};

const loadInfo = async ()=>{
    console.log("loading player info for", playerId);
    const res = await fetch("/api/nodeLog/" + playerId + "/getHistory");
    const json = await res.json();
    console.log(json);
    nodeLogs = json;
}  

$: {
  if(playerId) 
    loadInfo();
  else 
    nodeLogs = {}
}

let project = {};

const loadProject = async ()=>{ 
    console.log("loading project info for", projectId);
    const res = await fetch("/api/project/" + projectId);
    const json = await res.json();
    console.log(json);
    project = json; 
}

$: {
  if(projectId) 
    loadProject();
  else
    project = {}
}


/*const deletePlayer = async()=>{
  if(confirm("permanently delete player?")) {
    const res = await fetch("/api/player/" + playerId, {method: "DELETE", headers: {'authorization': $token}});
    clearPlayerId(playerId);
    close();
  }
}*/

</script>

<div class="info-container">

  <button class="close" on:click={close}>close</button>

  <p>playerId: {playerId}</p>

  <p>project: {project.name}</p>

  <p>socket connected: {socketConnectionStatus}</p>

  <VarList
    scope="player"
    ids={{player: playerId, project: projectId}}
    {authoring}
  />

  <VarList
    scope="playerNode"
    ids={{player: playerId, project: projectId}}
    {authoring}
  />

  <h4>node history</h4>
  <ul> 
  {#each Object.keys(nodeLogs) as key}
    <li>{nodeLogs[key][0].board.name}:
    {#each nodeLogs[key] as nl}
      {#if nl.node} -> <span class="nl">{nl.node.name} {nl.scheduled ? "(scheduled)" : ""}</span> {/if}
    {/each}
    </li>
  {/each}
  </ul>
  
  
  
  <!--button on:click={deletePlayer}>delete player</button-->

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
    
  }

</style>