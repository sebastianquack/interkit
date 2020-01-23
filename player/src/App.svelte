<svelte:head>
  <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyDQLtgFdKIsghQkoiYN-ojaa2wX7K4d630&callback=googleReady"></script>
</svelte:head>

<script>
  import { onMount } from 'svelte';
  import Chat from '../../shared/Chat.svelte';
  import { initSocket, getPlayerId } from '../../shared/socketClient.js';
  import Map from './Map.svelte';

  let googleReady = false;

  window.googleReady = ()=>{
    console.log("googleReady");
    googleReady = true;
  }

  let playerNodeId = null;
  let directURL = false;
  let loading = true;
  let stories = [];
  let currentStory = null;

  let map;

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

  const openMapTo = (item) => {
    console.log(item);
    mainView = "map";
    map.panTo(item.attachment);
    map.setZoom(17);
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

  let mainView = "chat";
    
</script>

<div class="main-container">

{#if !loading}

  <div class="top-menu">
    {#if playerNodeId}
        <button on:click={()=>{setPlayerNodeId(null);}}>{"←"}</button>
        {#if currentStory}
        <span
          class="breadcrumb"
          on:click={()=>{
            if(mainView!="chat") mainView="chat";
          }}
        >{currentStory.name}</span>
        {/if}
    {/if}
    <div class="menu-buttons-right">
      {#if mainView == "chat"}
        <button on:click={()=>mainView="map"}>map</button>
      {/if}
    </div>
  </div>

  <div class="content-container">
    {#if !playerNodeId}
        <ul class="story-select">
          {#each stories as story}
            <li on:click={()=>{launch(story)}}>
              {story.name} - <em>{story.description}</em> 
              {#if story.unSeenMessages } <small>(unread messages: {story.unSeenMessages})</small> {/if} 
            </li>
          {/each}
        </ul>
    {:else}
        <Chat
          {playerNodeId}
          {setPlayerNodeId}
          loadHistory={true}
          updateUnseenMessages={checkForUnseenMessages}
          mapClick={openMapTo}
        />
      {/if}
  </div>

  <Map
    bind:map={map}
    {googleReady}
    visible={mainView=="map"}
    onClose={()=>mainView="chat"}
  />

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
    left: 0;
    padding: 5px;
    width: 100%;
    box-sizing: border-box;
  }

  span.breadcrumb:hover {
    cursor: pointer;
  }

  .menu-buttons-right {
    position: absolute;
    right: 5px;
    top: 5px;
  }

  .content-container {
    position: absolute;
    top: 50px;
    bottom: 0;
    left: 0;
    right: 0;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
  }

  ul.story-select {
    padding: 0;
    margin: 0;
    margin-top: 1em;
  }

  ul.story-select li {
    list-style: none;
    padding: 15px;
    border-top: 1px solid lightgray;
    height: 2em;
    line-height: 2em;
  }

  ul.story-select li:last-child {
    border-bottom: 1px solid lightgray; 
  }


</style>


