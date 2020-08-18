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

    // get player from localStorage
    const playerIdCandidate = await localStorage.getItem('playerId')

    // create or find player
    playerId = await findOrCreatePlayer(playerIdCandidate);

    if (playerId === playerIdCandidate) {
      // player was valid and known
      bypassWelcome = true
    } else {
      // new player -> save
      await localStorage.setItem('playerId', playerId)
      loading = false;
    }
  });

  function setBypassWelcome(value) {
    bypassWelcome = value
  }

</script>


<div class="app-container">

  {#if bypassWelcome}
    <PlayerContainer {projectId} {playerId} {googleReady}/>
  {:else}
    <WelcomeScreen {setBypassWelcome} buttonHidden={projectId ? false : true} message={loading ? "Loading App..." : (projectId ? "" : "no project specified")}/>
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