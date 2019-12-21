<script>
  import { onMount } from 'svelte';
  import Chat from '../../shared/Chat.svelte';
  import { initSocket } from '../../shared/socketClient.js';

  let currentNodeId = null;
  let loading = true;

  onMount(async () => {
    initSocket();

    let searchParams = new URLSearchParams(window.location.search);
    if(searchParams.get("node")) {
      currentNodeId = searchParams.get("node");
    }
    loading = false;
  });
    
</script>

{#if !loading}

  {#if !currentNodeId}

    <h1>player view</h1>
    <p>for now, you need a direct url to a node to play</p>

  {:else}
    <div class="chat-container">
      <Chat
        {currentNodeId}
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


