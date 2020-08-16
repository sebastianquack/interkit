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

    // get player from URL, look for e.g. player/5f3945d16bf7b01450282cde
    const match = location.pathname.match(/player\/([a-z0-9]+)/)
    const playerIdCandidate = (match!==null && match.length == 2 ? match[1] : null)

    // create or find player
    playerId = await findOrCreatePlayer(playerIdCandidate);

    if (playerId === playerIdCandidate) {
      // player from URL was valid and known
      bypassWelcome = true
    }

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