<script>

  import { token } from './stores.js';
  
  import { onMount } from 'svelte';
  import EditNode from './EditNode.svelte';

  import Chat from '../../shared/Chat.svelte';
  
  let scriptNodes = [];
  let currentNodeIndex = -1;

  function setCurrentNode(index) {
    currentNodeIndex = index;
  }

  function closeNode() {
    currentNodeIndex = -1;
  }

  onMount(async () => {
    const res = await fetch("/api/scriptNode");
    const json = await res.json();
    scriptNodes = json.docs;
  });

  $: currentNode = scriptNodes[currentNodeIndex]
    
</script>

{#if currentNodeIndex == -1}

  <h2>list</h2>
  {#each scriptNodes as scriptNode, index}
    <li on:click="{()=>setCurrentNode(index)}">{scriptNode.name}</li>
  {/each}

{:else}

  {#if $token}

  <EditNode 
    scriptNode={scriptNodes[currentNodeIndex]}
    update="{(newNode) => {scriptNodes[currentNodeIndex] = newNode}}"
  />

  {:else}

  <h2>{currentNode.name}</h2>
  <p>{currentNode.initScript}</p>
  <p>{currentNode.responseScript}</p>

  {/if}

  <button on:click={closeNode}>back</button>

  <Chat
    currentNodeId={currentNode._id}
  />

{/if}


<style>

  li:hover { cursor: pointer; }

</style>