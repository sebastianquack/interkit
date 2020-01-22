<script>
  import { onMount } from 'svelte';
  import Chat from '../../shared/Chat.svelte';
  import { initSocket, getPlayerId } from '../../shared/socketClient.js';

  let playerNodeId = null;
  let directURL = false;
  let loading = true;
  let stories = [];
  let currentStory = null;

  const checkForUnseenMessages = async () => {
    for(let i = 0; i < stories.length; i++) {
      let story = stories[i];
      const query = {
        board: story._id, 
        recipients: getPlayerId(),
        seen: {"$nin": [getPlayerId()]}
      };
      const res = await fetch("/api/message?$where=" + JSON.stringify(query));
      const mjson = await res.json();
      const messages = mjson.docs;
      //console.log("unseen", messages.length);
      stories[i] = {...story, unSeenMessages: messages.length}
    }
    stories = stories;
    //console.log(stories);
  }

  onMount(async () => {
    await initSocket();

    let searchParams = new URLSearchParams(window.location.search);
    if(searchParams.get("board")) {
      let res = await fetch("/api/board/" + searchParams.get("board"));
      let json = await res.json();
      playerNodeId = json.startingNode;
      directURL = true;
    }

    const res = await fetch("/api/board?$where=" + JSON.stringify({"listed": true}));
    const json = await res.json();
    stories = json.docs;
    await checkForUnseenMessages();
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
      <li on:click={()=>{launch(story)}}>
        {story.name} - <em>{story.description}</em> 
        {#if story.unSeenMessages } <small>(unread messages: {story.unSeenMessages})</small> {/if} 
      </li>
    {/each}
    </ul>

  {:else}

    {#if !directURL}
      <div class="top-menu">
        <span>{currentStory ? currentStory.name : ""}</span>
        <button on:click={()=>{setPlayerNodeId(null)}}>exit</button>
      </div>
    {/if}

    <div class="chat-container {directURL ? 'chat-container-no-menu' : ''}">
      <Chat
        {playerNodeId}
        {setPlayerNodeId}
        loadHistory={true}
        updateUnseenMessages={checkForUnseenMessages}
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

  .chat-container-no-menu {
    top: 0px;
  }

</style>


