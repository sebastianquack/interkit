<svelte:head>
  <script src="https://maps.googleapis.com/maps/api/js?libraries=geometry&key=AIzaSyDQLtgFdKIsghQkoiYN-ojaa2wX7K4d630&callback=googleReady"></script>
</svelte:head>

<script>
  import { onMount } from 'svelte';
  import { getConfig } from '../../shared/util.js';
  import PlayerContainer from './PlayerContainer.svelte';
  import WelcomeScreen from './WelcomeScreen.svelte'
  import "./app.css";
  import "./player.css";

  let projectId;
  let playerId = null;

  let googleReady = false;
  let loading = true;

  window.googleReady = ()=>{
    console.log("googleReady");
    googleReady = true;
  }

  onMount(async () => {    
    
    // parse search Params
    let searchParams = new URLSearchParams(window.location.search);
    
    // projectId low priority - use default project defined in config - used when user opens player first time
    let defaultProjectId = await getConfig("defaultProject");
    if(defaultProjectId) {
      console.log("using defaultProject", defaultProjectId)
      projectId = defaultProjectId;
    }
    
    // projectId medium priority - get project id form url param - used in url from authoring
    if(searchParams.get("project")) {
      projectId = searchParams.get("project");
      console.log("overriding with projectId from url param", projectId)
    }

    // get projectId & playerId from path - for PWA install on iOS and for opening personal links
    if(location.pathname.includes("project") && location.pathname.includes("player")) {
      let parts = location.pathname.split("/")
      if(parts.length == 6) {
        projectId = parts[2]
        console.log("overriding with projectId from url path", projectId)
        
        playerId = parts[4] // playerId low priority
        console.log("found playerId in url path", playerId)
      }
    }

    // playerId medium priority - get player from localStorage (playerId might have been reset in client)
    if(localStorage.getItem('playerId')) {
      playerId = localStorage.getItem('playerId');
      console.log("found playerId in localStorage, using that", playerId)
    }

    loading = false;
  });

  let bypassWelcome = false;

  function setBypassWelcome(value) {
    bypassWelcome = value
  }

</script>


<div class="app-container">

{#if projectId}   

  {#if playerId || bypassWelcome }
    <PlayerContainer {projectId} {playerId} {googleReady}/>
  {:else}
    <WelcomeScreen {setBypassWelcome} />
  {/if}
    
{:else}

  {#if loading}
    <p style="margin: 16px">loading...</p>
  {:else}
    <p style="margin: 16px">no project specified</p>
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