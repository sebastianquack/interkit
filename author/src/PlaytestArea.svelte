<script>
  import PlayerInfo from './PlayerInfo.svelte';

  import PlayerContainer from '../../player/src/PlayerContainer.svelte';
  
  export let projectId;
  export let clearPlayerId;
  export let setEditNodeId;
  export let updatePlayerNodeId;
  export let googleReady;
  export let resetPlayer;

  let playerInfoOpen = false;
  const togglePlayerInfo = () => {
    playerInfoOpen = true;
  }

</script>
  
  <PlayerContainer
    {projectId}
    bind:value={playerId}
    {setEditNodeId}
    authoring={true}
    {togglePlayerInfo}
    {updatePlayerNodeId}
    {googleReady}
  />

  {#if playerInfoOpen && playerId}
    <PlayerInfo
      {playerId}
      {clearPlayerId}
      close={()=>playerInfoOpen = false}
    />
  {/if}


