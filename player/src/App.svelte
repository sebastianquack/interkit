<script>
  import { onMount } from 'svelte';
  import Chat from '../../shared/Chat.svelte';
  import { initSocket } from '../../shared/socketClient.js';

  let playerNodeId = null;
  let loading = true;
  let stories = [];
  let currentStory = null;

  onMount(async () => {
    initSocket();

    let searchParams = new URLSearchParams(window.location.search);
    if(searchParams.get("node")) {
      playerNodeId = searchParams.get("node");
    }

    const res = await fetch("/api/board?$where=" + JSON.stringify({"listed": true}));
    const json = await res.json();
    stories = json.docs;

    loading = false;
  });

  const setPlayerNodeId = (nodeId)=>{playerNodeId = nodeId}; 
  const launch = (story) => {
    currentStory = story;
    setPlayerNodeId(story.startingNode);
  }
    
</script>

<div class="main-container">

{#if !loading}

  {#if !playerNodeId}

    <h2>tap on a story to start</h2>
    <ul>
    {#each stories as story}
      <li on:click={()=>{launch(story)}}>{story.name} - <em>{story.description}</em></li>
    {/each}
    </ul>

  {:else}

    <div class="top-menu">
      <span>{currentStory ? currentStory.name : ""}</span>
      <button on:click={()=>{setPlayerNodeId(null)}}>exit</button>
    </div>

    <div class="chat-container">
      <Chat
        {playerNodeId}
        {setPlayerNodeId}
      />
    </div>

  {/if}
{/if}

</div>

<style>

  .main-container {
    position: absolute;
    top: 0;
    width: 100%;
    height: 100vh;
    max-width: 600px;
    background-color: white;
    left: 50%;
    transform: translate(-50%, 0);
    padding: 8px;
    box-sizing: border-box;
  }

  li:hover {
    cursor: pointer;
  }

  .top-menu {
    height: 50px;
    position: absolute;
    top: 0;
    right: 0;
    padding: 5px;
  }

  .chat-container {
    position: absolute;
    top: 50px;
    bottom: 0;
    left: 0;
    right: 0;
    box-sizing: border-box;
  }

</style>


