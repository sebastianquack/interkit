<svelte:head>
  <script src="https://maps.googleapis.com/maps/api/js?key=AIzaSyDQLtgFdKIsghQkoiYN-ojaa2wX7K4d630&callback=googleReady"></script>
</svelte:head>

<script>
  import { onMount } from 'svelte';
  import Chat from './Chat.svelte';
  import { initSocket, getPlayerId, listenForMessages } from '../../shared/socketClient.js';
  import Map from './Map.svelte';
  import Archive from './Archive.svelte';
  import Modal from './Modal.svelte';
  import LockScreen from './LockScreen.svelte';
  import { getConfig } from '../../shared/util.js';

  // the two main props that this comonent reacts on
  export let projectId;
  export let playerId;

  // special props for using in authoring app
  export let authoring;
  export let togglePlayerInfo;
  export let setEditNodeId;
  export let updatePlayerNodeId; // for tellig the authoring system when player has moved to new node


  let boards = [];
  let currentBoard = null; // if this is set, the chat is open
  
  let map;
  let markerItems;
  let documentItems;

  let chatMessageHandler = null;
  
  let mainView = "chat";
  let itemModal = null;
  let showLockScreen = false;
  let notificationItem = null;
  
  let loading = true;
  let fileServerURL = "";
  let googleReady = false;


  window.googleReady = ()=>{
    console.log("googleReady");
    googleReady = true;
  }

  const setLockScreen = ()=>showLockScreen=true;
  
  const setNotificationItem = (item)=>{
    //console.log("setNotificationItem", item);
    if(!item.attachment) item.attachment = {};
    if(!item.params) item.params = {};
    notificationItem = item;
  }

  const setItemModal = (item)=>itemModal = item;

  const checkForUnseenMessages = async () => {
    for(let i = 0; i < boards.length; i++) {
      let board = boards[i];
      const query = {
        board: board._id, 
        recipients: playerId,
        scheduled: false,
        seen: {"$nin": [playerId]}
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
    let itemsRes = await fetch("/api/player/" + playerId + "/item");
    let itemsJson = await itemsRes.json();
    if(itemsJson.docs)
      markerItems = itemsJson.docs.filter(m=>m.type == "location");
    else 
      markerItems = [];
  }

  const loadDocuments = async () => {
    let itemsRes = await fetch("/api/player/" + playerId + "/item");
    let itemsJson = await itemsRes.json();
    if(itemsJson.docs)
      documentItems = itemsJson.docs.filter(m=>m.type == "document");
  }

  const launch = (board) => {
    console.log("launching board", board.name, board._id)
    currentBoard = board;
  }

  const openBoardFromNodeId = async (nodeId)=>{
    let res = await fetch("/api/scriptNode/" + nodeId + "?$embed=board");
    let nodeJson = await res.json();      
    currentBoard = nodeJson.board;
  }

  const openBoardForMessage = async (boardId, nodeId)=>{
    showLockScreen = false;
    console.log("launching from notification", boardId);
    let res = await fetch("/api/board/" + boardId);
    let json = await res.json();
    currentBoard = json;
    mainView = "chat";
  }
  
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

  const initPlayerContainerSocket = ()=>{
    console.log("initialising socket message listener on player container");
    listenForMessages(async (message)=>{
      console.log("player container received message", message)
      if(chatMessageHandler) {
        console.log("handing off to chatMessageHandler");
        chatMessageHandler(message);
      } else {
        console.log("player container received message", message)
        setNotificationItem({...message, side: "left"});
        setLockScreen();
        await checkForUnseenMessages();
        // todo here: make sure we process or display moveTo messages somehow
      }
    });
  }

  const registerMessageHandler = (handler) => {
    console.log("registerMessageHandler", handler);
    chatMessageHandler = handler
  }

  // reactive & lifecycle calls


  onMount(async () => {
    
    // for projects with only one listed board, automatically go to that board
    if(projectId) {
      const res = await fetch("/api/board?$where=" + JSON.stringify(
        {"listed": true, "project": projectId}));
      const json = await res.json();
      boards = json.docs;
      
      if(boards.length == 1) {
        console.log("project has only 1 listed board, using that", boards[0]);
        currentBoard = boards[0];
      }
    } 
    
    fileServerURL = await getConfig("fileServerURL");
    loading = false;

    initPlayerContainerSocket();
  });

  // this happens when player is switched or deleted in authoring
  $: {
    console.log("playerContainer: playerId changed", playerId);
    if(playerId) 
      loadMarkers();
    else 
      currentBoard = null;
  }

  // resets message listener when player leaves board -> todo refactor, unsafe
  $: {
    console.log("playerContainer: currentBoard changed", currentBoard);
    if(!currentBoard) {
      checkForUnseenMessages();    
    }
  }



</script>

<div class="main-container">

{#if !loading}

  <div class="top-menu {mainView == "chat" ? "highlight" : ""}">
    {#if currentBoard && mainView == "chat"}
        {#if boards.length > 1}
          <button style="width: 2em" on:click={()=>{currentBoard = null}}>{"<"}</button>
        {/if}
        {#if currentBoard && boards.length > 1}
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
    {#if !currentBoard}
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
          {playerId}
          {projectId}
          {currentBoard}
          updateUnseenMessages={checkForUnseenMessages}
          mapClick={openMapTo}
          {setNotificationItem}
          {showLockScreen}
          {setLockScreen}
          {mainView}
          {setEditNodeId}
          {authoring}
          {togglePlayerInfo}
          {updatePlayerNodeId}
          {registerMessageHandler}
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
    {openBoardForMessage}
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
    position: relative;
    width: 100%;
    height: 100%;
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


