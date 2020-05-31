<script>
  import Chat from '../../shared/Chat.svelte';
  import PlayerInfo from './PlayerInfo.svelte';
  
  export let playerNodeId = null;
  export let playerId;
  export let setPlayerId;
  export let clearPlayerId;
  export let setEditNodeId;
  export let setPlayerNodeId;
  
  let playerInfoOpen = false;

  const togglePlayerInfo = (newPlayerId) => {
    playerInfoOpen = true;
    setPlayerId(newPlayerId);
  }

</script>

{#if playerNodeId}
  
  <Chat
    {playerNodeId}
    {setPlayerNodeId}
    {setEditNodeId}
    authoring={true}
    {togglePlayerInfo}
  />

  {#if playerInfoOpen && playerId}
    <PlayerInfo
      {playerId}
      {clearPlayerId}
      close={()=>playerInfoOpen = false}
    />
  {/if}

{/if}
