<svelte:head>
  <script src="https://maps.googleapis.com/maps/api/js?libraries=geometry&key=AIzaSyDQLtgFdKIsghQkoiYN-ojaa2wX7K4d630&callback=googleReady"></script>
</svelte:head>

<script>
  import { onMount } from 'svelte';
  import { getConfig } from '../../shared/util.js';
  import PlayerContainer from './PlayerContainer.svelte';
  import "./base.css";

  let projectId;
  let playerId = null;

  let googleReady = false;
  let loading = true;

  window.googleReady = ()=>{
    console.log("googleReady");
    googleReady = true;
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

    // try to get player id form url param
    playerId = searchParams.get("player");

    // try to get player id from path
    if(location.pathname.includes("project") && location.pathname.includes("player")) {
      let parts = location.pathname.split("/")
      if(parts.length == 6) {
        projectId = parts[2]
        playerId = parts[4]
        console.log("project: " + projectId + " player: " + playerId)
      }
    }


    loading = false;
  });

</script>


<div class="app-container">

{#if projectId}   

    <PlayerContainer {projectId} {playerId} {googleReady}/>
    
{:else}

  {#if loading}
    <p style="margin: 16px">loading...</p>
  {:else}
    <p style="margin: 16px">no project specified</p>v
  {/if}

{/if}

</div>


<style>


.app-container {
    position: absolute;
    top: 0;
    width: 100%;
    height: 100%;
    max-width: 600px;
    background-color: var(--color-bright);
    left: 50%;
    transform: translate(-50%, 0);
    box-sizing: border-box;
  }

</style>