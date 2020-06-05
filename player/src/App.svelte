<svelte:head>
  <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyDQLtgFdKIsghQkoiYN-ojaa2wX7K4d630&callback=googleReady"></script>
</svelte:head>

<script>
  import { onMount } from 'svelte';
  import { initSocket, getPlayerId } from '../../shared/socketClient.js';
  import { getConfig } from '../../shared/util.js';
  import PlayerContainer from './PlayerContainer.svelte';

  let projectId;
  let playerId;

  let googleReady = false;

  window.googleReady = ()=>{
    console.log("googleReady");
    googleReady = true;
  }

  onMount(async () => {    
    let searchParams = new URLSearchParams(window.location.search);
    projectId = searchParams.get("project");

    if(!projectId) {
      let defaultProjectId = await getConfig("defaultProject");
      if(defaultProjectId) {
        projectId = defaultProjectId;
      }
    }

    await initSocket();
    playerId = await getPlayerId();
  });

</script>


<div class="app-container">

{#if projectId && playerId}   

    <PlayerContainer {projectId} {playerId} {googleReady}/>
    
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