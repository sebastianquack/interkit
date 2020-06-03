<script>
  import Chat from '../../shared/Chat.svelte';
  import PlayerInfo from './PlayerInfo.svelte';

  import PlayerContainer from '../../player/src/PlayerContainer.svelte';
  
  export let projectId;
  export let playerId;
  export let setPlayerId;
  export let clearPlayerId;
  export let setEditNodeId;
  export let updatePlayerNodeId;
  
  let playerInfoOpen = false;

  const togglePlayerInfo = (newPlayerId) => {
    playerInfoOpen = true;
    setPlayerId(newPlayerId);
  }

</script>
  
  <PlayerContainer
    {projectId}
    {setEditNodeId}
    authoring={true}
    {togglePlayerInfo}
    {updatePlayerNodeId}
  />

  {#if playerInfoOpen && playerId}
    <PlayerInfo
      {playerId}
      {clearPlayerId}
      close={()=>playerInfoOpen = false}
    />
  {/if}


