<script>
  import { onMount } from 'svelte';
  import Chat from '../../shared/Chat.svelte';
  import { initSocket } from '../../shared/socketClient.js';

  //let scriptNodes = [];
  let currentNode = null;
  let nodeParam = false;
  let loading = true;

  onMount(async () => {
    initSocket();

    /*const res = await fetch("/api/scriptNode");
    const json = await res.json();
    scriptNodes = json.docs;*/

    let searchParams = new URLSearchParams(window.location.search);
    if(searchParams.get("node")) {
      nodeParam = true;
      let params = `?$where={"name": "${searchParams.get("node")}"}`
      const res = await fetch("/api/scriptNode" + encodeURI(params));
      const json = await res.json();
      if(json.docs.length == 1) {
        currentNode = json.docs[0];
      }
    }

    loading = false;
  });
    
</script>

{#if !loading}

  {#if !currentNode}

    <h1>player view</h1>
    <p>for now, you need a direct url to a node to play</p>

  {:else}
    <div class="chat-container">
      <Chat
        currentNodeId={currentNode._id}
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


