<svelte:head>
  <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyDQLtgFdKIsghQkoiYN-ojaa2wX7K4d630&callback=googleReady"></script>
  <script src="/markerclusterer.min.js"></script>
</svelte:head>

<script>
  import { onMount } from 'svelte';
  import { getConfig } from '../../shared/util.js';
  import PlayerContainer from './PlayerContainer.svelte';

  let projectId;

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

    loading = false;
  });

</script>


<div class="app-container">

{#if projectId}   

    <PlayerContainer {projectId} {googleReady}/>
    
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
    background-color: white;
    left: 50%;
    transform: translate(-50%, 0);
    box-sizing: border-box;
  }

</style>