<script>
  import { onMount } from 'svelte';
  import Chat from '../../shared/Chat.svelte';
  import { initSocket } from '../../shared/socketClient.js';

  let scriptNodes = [];
  let currentNode = null;

  onMount(async () => {
    initSocket();
    const res = await fetch("/api/scriptNode");
    const json = await res.json();
    scriptNodes = json.docs;
  });
    
</script>

<h1>player interface</h1>

{#if !currentNode}

  {#each scriptNodes as scriptNode}
    <li on:click="{()=>currentNode = scriptNode}">{scriptNode.name}</li>
  {/each}

{:else}

  <button on:click="{()=>currentNode = null}">close</button>

  <Chat
    currentNodeId={currentNode._id}
  />

{/if}

<style>

  li:hover { cursor: pointer; }

</style>