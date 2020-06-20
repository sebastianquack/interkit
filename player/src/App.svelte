<svelte:head>
  <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyDQLtgFdKIsghQkoiYN-ojaa2wX7K4d630&callback=googleReady"></script>
</svelte:head>

<script>
  import { onMount } from 'svelte';
  import { initSocket, registerPlayer } from '../../shared/socketClient.js';
  import { getConfig, findOrCreatePlayer, refreshPlayerId } from '../../shared/util.js';
  import PlayerContainer from './PlayerContainer.svelte';

  let projectId;
  let playerId;

  let googleReady = false;

  window.googleReady = ()=>{
    console.log("googleReady");
    googleReady = true;
  }

  const resetPlayer = async ()=> {
    playerId = null; // set to null first so attached player resets
    playerId = await refreshPlayerId();
    registerPlayer(playerId);
  }

  onMount(async () => {    
    
    // try to get project id form url param
    let searchParams = new URLSearchParams(window.location.search);
    projectId = searchParams.get("project");

    // try to get project id from local storage
    if(!projectId) {
      projectId = localStorage.getItem("projectId");
    }

    // try to get default project
    if(!projectId) {
      let defaultProjectId = await getConfig("defaultProject");
      if(defaultProjectId) {
        projectId = defaultProjectId;
      }
    }

    // save projectId for later
    if(projectId)
      localStorage.setItem("projectId", projectId);

    playerId = await findOrCreatePlayer();
    await initSocket(playerId);
    
  });

</script>


<div class="app-container">

{#if projectId && playerId}   

    <PlayerContainer {projectId} {playerId} {googleReady} {resetPlayer}/>
    
{:else}

  <p style="margin: 16px">nothing to see here...</p>

{/if}

</div>


<style>


.app-container {
    position: absolute;
    top: 0;
    width: 100%;
    height: 100%;
    max-width: 600px;
    background-color: white;
    left: 50%;
    transform: translate(-50%, 0);
    box-sizing: border-box;
  }

</style>