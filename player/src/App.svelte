<svelte:head>
  <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyDQLtgFdKIsghQkoiYN-ojaa2wX7K4d630&callback=googleReady"></script>
</svelte:head>

<script>
  import { onMount } from 'svelte';
  import Chat from '../../shared/Chat.svelte';
  import { initSocket, getPlayerId } from '../../shared/socketClient.js';
  import Map from './Map.svelte';
  import Archive from './Archive.svelte';
  import Modal from './Modal.svelte';
  import LockScreen from './LockScreen.svelte';
  import { getConfig } from '../../shared/util.js';

  let googleReady = false;

  window.googleReady = ()=>{
    console.log("googleReady");
    googleReady = true;
  }

  let playerNodeId = null;
  let directURL = false;
  let loading = true;
  let empty = false;
  let boards = [];
  let currentBoard = null;

  let map;
  let markerItems;
  let documentItems;
  let itemModal = null;

  let showLockScreen = false;
  const setLockScreen = ()=>showLockScreen=true;
  let notificationItem = null;
  const setNotificationItem = (item)=>{
    console.log(item);
    if(showLockScreen)
      notificationItem = item;
  }

  let fileServerURL = "";

  const setItemModal = (item)=>itemModal = item;

  const checkForUnseenMessages = async () => {
    for(let i = 0; i < boards.length; i++) {
      let board = boards[i];
      const query = {
        board: board._id, 
        recipients: getPlayerId(),
        scheduled: false,
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

  const openMapTo = (chatItem) => {
    console.log(chatItem);
    mainView = "map";
    map.panTo(chatItem.attachment);
    map.setZoom(17);
  }

  const loadMarkers = async () => {
    let itemsRes = await fetch("/api/player/" + getPlayerId() + "/item");
    let itemsJson = await itemsRes.json();
    markerItems = itemsJson.docs.filter(m=>m.type == "location");
  }

  const loadDocuments = async () => {
    let itemsRes = await fetch("/api/player/" + getPlayerId() + "/item");
    let itemsJson = await itemsRes.json();
    documentItems = itemsJson.docs.filter(m=>m.type == "document");
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
      if(projectId == "") {
        projectId = null;
      }
    }
    console.log("projectId", projectId);
    
    if(!playerNodeId && projectId) {
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
    } 

    if(!projectId && !playerNodeId) {
      empty = true;
    }

    await loadMarkers();
    fileServerURL = await getConfig("fileServerURL");
    loading = false;
  });

  const setPlayerNodeId = (nodeId)=>{playerNodeId = nodeId}; 
  const launch = (board) => {
    console.log("launching", board)
    currentBoard = board;
    setPlayerNodeId(board.startingNode);
  }

  let mainView = "chat";

  const openChat = async () => {
    mainView = "chat"
  }
  
  const openMap = async () => {
    await loadMarkers();
    mainView = "map";
  }

  const openArchive = async () => {
    await loadDocuments();
    mainView = "archive";
  }

</script>

<div class="main-container">

{#if empty}   
  <p style="margin: 16px">nothing to see here...</p>
{/if}

{#if !loading && !empty}

  <div class="top-menu {mainView == "chat" ? "highlight" : ""}">
    {#if playerNodeId && mainView == "chat"}
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
      <button disabled={mainView == "chat"} on:click={openChat}>chat</button>
      <button disabled={mainView == "archive"} on:click={openArchive}>archive</button>
      <button disabled={mainView == "map"} on:click={openMap}>map</button>
    </div>
  </div>

  <div class="content-container">
    {#if !playerNodeId}
        <ul class="board-select">
          {#each boards as board}
            <li on:click={()=>{launch(board)}}>
              {board.name} {#if board.description} - {board.description} {/if}
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
          {setItemModal}
          {setNotificationItem}
          {setLockScreen}
        />
      {/if}
  </div>

  <Map
    bind:map={map}
    {googleReady}
    visible={mainView=="map"}
    onClose={openChat}
    {markerItems}
    {setItemModal}
  />

  <Archive
    visible={mainView=="archive"}
    onClose={openChat}
    items={documentItems}
    {setItemModal}
  />

  <Modal
    visible={itemModal}
    item={itemModal}
    {fileServerURL}
    onClose={() => itemModal = null}
  />


  <LockScreen
    {notificationItem}
    visible={showLockScreen}
    onClose={()=>{
      showLockScreen = false;
      notificationItem = null;
    }}
  />

{/if}

</div>

<style>

  button {
    color: #999;
  }

  button:disabled,
  button[disabled] {
    color: #000;
  }

  .main-container {
    position: absolute;
    top: 0;
    width: 100%;
    height: 100vh;
    max-width: 500px;
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
    position: fixed;
    top: 0;
    left: 0;
    padding: 10px;
    width: 100%;
    box-sizing: border-box;
    z-index: 10;
  }

  .highlight {
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

  .menu-buttons-right button {
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
    overflow: scroll;
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


