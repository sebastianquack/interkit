<svelte:head>
  <script src="https://maps.googleapis.com/maps/api/js?libraries=geometry&key=AIzaSyDQLtgFdKIsghQkoiYN-ojaa2wX7K4d630&callback=googleReady"></script>
</svelte:head>

<script>
  import { onMount } from 'svelte';
  import { getConfig, findOrCreatePlayer } from '../../shared/util.js';
  import PlayerContainer from './PlayerContainer.svelte';
  import WelcomeScreen from './WelcomeScreen.svelte'
  import "./app.css";
  import "./player.css";

  let projectId, playerId;

  let googleReady = false;
  let loading = true;

  let bypassWelcome = false;

  window.googleReady = ()=>{
    console.log("googleReady");
    googleReady = true;
  }

  onMount(async () => {    

    // projectId - use default project defined in config
    let defaultProjectId = await getConfig("defaultProject");
    if(defaultProjectId) {
      console.log("using defaultProject", defaultProjectId)
      projectId = defaultProjectId;
    }

    let playerIdCandidate = null;

    if(location.pathname.includes("player/")) {
      let parts = location.pathname.split("/")
      if(parts.length == 4) {
        playerIdCandidate = parts[2] // playerId
        console.log("found playerId in url path", playerId)
      }
    }

    playerId = await findOrCreatePlayer(playerIdCandidate); // create or find player

    if (playerId === playerIdCandidate) {
      bypassWelcome = true
    }

    console.log(playerIdCandidate + " " + playerId + " " + projectId)

    //const specialPort = location.port !== 80 || location.post !== 443
    //const targetURL = `${location.protocol}//${location.hostname}${specialPort && ':' + location.port}
    history.replaceState({interkit_player_generated: true}, document.title, `/player/${playerId}`);

    loading = false;
  });

  function setBypassWelcome(value) {
    bypassWelcome = value
  }

</script>


<div class="app-container">

{#if projectId}   

  {#if bypassWelcome}
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