<script>
  import Chat from '../../shared/Chat.svelte';
  import PlayerInfo from './PlayerInfo.svelte';

  import PlayerClient from '../../player/src/PlayerClient.svelte';
  
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
  
  <PlayerClient
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


