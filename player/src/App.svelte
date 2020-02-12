<svelte:head>
  <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyDQLtgFdKIsghQkoiYN-ojaa2wX7K4d630&callback=googleReady"></script>
</svelte:head>

<script>
  import { onMount } from 'svelte';
  import Chat from '../../shared/Chat.svelte';
  import { initSocket, getPlayerId } from '../../shared/socketClient.js';
  import Map from './Map.svelte';
  import { getConfig } from '../../shared/util.js';

  let googleReady = false;

  window.googleReady = ()=>{
    console.log("googleReady");
    googleReady = true;
  }

  let playerNodeId = null;
  let directURL = false;
  let loading = true;
  let boards = [];
  let currentBoard = null;

  let map;

  const checkForUnseenMessages = async () => {
    for(let i = 0; i < boards.length; i++) {
      let board = boards[i];
      const query = {
        board: board._id, 
        recipients: getPlayerId(),
        seen: {"$nin": [getPlayerId()]}
      };
      const res = await fetch("/api/message?$where=" + JSON.stringify(query));
      const mjson = await res.json();
      const messages = mjson.docs;
      //console.log("unseen", messages.length);
      boards[i] = {...board, unSeenMessages: messages.length}
    }
    boards = boards;
    //console.log(boards);
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

    let projectId = searchParams.get("project");
    if(!projectId) {
      projectId = await getConfig("defaultProject");
    }
    console.log("projectId", projectId);
    
    const res = await fetch("/api/board?$where=" + JSON.stringify(
      {"listed": true, "project": projectId}));
    const json = await res.json();
    boards = json.docs;
    await checkForUnseenMessages();
    
    console.log(boards);
    if(boards.length == 1) {
      playerNodeId = boards[0].startingNode;
      directURL = true;
      console.log("opening starting node");
    }

    loading = false;
  });

  const setPlayerNodeId = (nodeId)=>{playerNodeId = nodeId}; 
  const launch = (board) => {
    console.log("launching", board)
    currentBoard = board;
    setPlayerNodeId(board.startingNode);
  }

  let mainView = "chat";
    
</script>

<div class="main-container">

{#if !loading}

  <div class="top-menu">
    {#if playerNodeId}
        {#if !directURL}
          <button style="width: 2em" on:click={()=>{setPlayerNodeId(null);}}>{"<"}</button>
        {/if}
        {#if currentBoard}
        &nbsp;<span
          class="breadcrumb"
          on:click={()=>{
            if(mainView!="chat") mainView="chat";
          }}
        >{currentBoard.name}</span>
        {/if}
    {/if}
    <div class="menu-buttons-right">
      {#if mainView == "chat"}
        <button class="map-button" on:click={()=>mainView="map"}>open map</button>
      {/if}
    </div>
  </div>

  <div class="content-container">
    {#if !playerNodeId}
        <ul class="board-select">
          {#each boards as board}
            <li on:click={()=>{launch(board)}}>
              {board.name} - {board.description}
              {#if board.unSeenMessages } <small>(unread messages: {board.unSeenMessages})</small> {/if} 
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
    height: 55px;
    position: absolute;
    top: 0;
    left: 0;
    padding: 10px;
    width: 100%;
    box-sizing: border-box;
    background-color: lightgreen;
    border-bottom: 1px solid gray;
  }

  span.breadcrumb:hover {
    cursor: pointer;
  }

  .menu-buttons-right {
    position: absolute;
    right: 10px;
    top: 10px;
  }

  button.map-button {
    box-shadow: 2px 2px #ddd;
  }

  .content-container {
    position: absolute;
    top: 55px;
    bottom: 0;
    left: 0;
    right: 0;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
  }

  ul.board-select {
    padding: 0;
    margin: 0;
  }

  ul.board-select li {
    list-style: none;
    padding: 15px;
    border-top: 1px solid lightgray;
    height: 2em;
    line-height: 2em;
  }

  ul.board-select li:last-child {
    border-bottom: 1px solid lightgray; 
  }


</style>


