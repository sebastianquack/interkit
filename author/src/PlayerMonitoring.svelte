<script>

import { token } from './stores.js';  

export let projectId;
export let close;
export let clearPlayerId;
export let playerId;

let nodeLogs = [];

const loadPlayers = async ()=>{
    console.log("loading players for project", projectId);
    const res = await fetch("/api/nodeLog?project=" + projectId + "&$embed=node&$embed=board");
    const json = await res.json();
    console.log(json);
    if(json.docs) nodeLogs = json.docs;
}  

$: {
  if(projectId) loadPlayers();
}

const deletePlayer = async(playerId)=>{
  if(confirm("permanently delete player?")) {
    const res = await fetch("/api/player/" + playerId, {method: "DELETE", headers: {'authorization': $token}});
    await clearPlayerId(playerId);
    loadPlayers();
  }
}

</script>

<div class="container">

<h3>active players <button on:click={close}>close</button></h3> 

<ul>
  {#each nodeLogs as nl}
  <li>{nl.player} {nl.board.name}/{nl.node.name} {nl.player == playerId ? "(active)" : ""} <button on:click={()=>deletePlayer(nl.player)}>delete player</button></li>
  {/each}
</ul>

</div>


<style>

  h3 button {
    margin-left: 5px;
    font-size: 16px;
  }

  .container {
    height: 100vh;
    position: absolute;
    top: 0;
    left: 0;
    padding-left: 10px;
    box-sizing: border-box;
    overflow: scroll;
    width: 100%;
    background-color: #fff;
  }


</style>