<script>
  import Chat from '../../shared/Chat.svelte';
  import PlayerInfo from './PlayerInfo.svelte';

  import PlayerContainer from '../../player/src/PlayerContainer.svelte';
  
  export let projectId;
  export let playerId;
  export let clearPlayerId;
  export let setEditNodeId;
  export let updatePlayerNodeId;
  
  let playerInfoOpen = false;
  const togglePlayerInfo = () => {
    playerInfoOpen = true;
  }

</script>
  
  <PlayerContainer
    {projectId}
    {setEditNodeId}
    authoring={true}
    {togglePlayerInfo}
    {updatePlayerNodeId}
    {playerId}
  />

  {#if playerInfoOpen && playerId}
    <PlayerInfo
      {playerId}
      {clearPlayerId}
      close={()=>playerInfoOpen = false}
    />
  {/if}


