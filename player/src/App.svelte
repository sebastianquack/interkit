<script>
  import { onMount } from 'svelte';
  import Chat from '../../shared/Chat.svelte';
  import { initSocket } from '../../shared/socketClient.js';

  let playerNodeId = null;
  const setPlayerNodeId = (nodeId)=>{playerNodeId = nodeId}; 
  let loading = true;

  onMount(async () => {
    initSocket();

    let searchParams = new URLSearchParams(window.location.search);
    if(searchParams.get("node")) {
      playerNodeId = searchParams.get("node");
    }
    loading = false;
  });
    
</script>

{#if !loading}

  {#if !playerNodeId}

    <h1>player view</h1>
    <p>for now, you need a direct url to a node to play</p>

  {:else}
    <div class="chat-container">
      <Chat
        {playerNodeId}
        {setPlayerNodeId}
      />
    </div>

  {/if}
{/if}

<style>

  .chat-container {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    box-sizing: border-box;
    height: 100vh;
  }

</style>


