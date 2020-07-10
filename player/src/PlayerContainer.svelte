<script>
  import { onMount } from 'svelte';
  import { getConfig, findOrCreatePlayer, logPlayerToProject, refreshPlayerId, postPlayerMessage } from '../../shared/util.js';
  import { initSocket, registerPlayer, listenForMessages, doWhenConnected } from '../../shared/socketClient.js';
  
  import Chat from './Chat.svelte';
  import Map from './Map.svelte';
  import Archive from './Archive.svelte';
  import Modal from './Modal.svelte';
  import LockScreen from './LockScreen.svelte';
  import Menu from './Menu.svelte';
  import Alert from './Alert.svelte';
  import DebugPanel from './DebugPanel.svelte';
  
  // the two main props that this comonent reacts on
  export let projectId; 
  // project is always set from outside
  export let playerId = null; 
  // playerId is normally managed here by playerContainer, but can optionally be set in authoring to attach different players

  // special props for using in authoring app
  export let authoring = false;
  export let setEditNodeId;
  export let updatePlayerNodeId; // for tellig the authoring system when player has moved to new node
  export let googleReady;
  
  let boards = [];
  let currentBoard = null; // if this is set, the chat is open
  
  let map;
  let markerItems;
  let documentItems;
  let arrowMode = false;
  let arrowTarget = null;
  let arrowDirection = 0;

  let chatMessageHandler = null;
  
  let mainView = "chat";
  let itemModal = null;
  let showLockScreen = false;
  let notificationItem = null;
  
  let archiveButtonLabel = null;
  let loading = true;
  let fileServerURL = "";
  let menuOpen = false;
  let debugPanelOpen = false;
  let socketConnectionStatus = null;
  const updateConnectionStatus = (s)=>socketConnectionStatus=s;
  
  const setLockScreen = ()=>showLockScreen=true;

  let showAlert = false;
  let alertOptions = null;
  const displayAlert = (options) => {
    alertOptions = options;
    showAlert = true;
  }
  
  const setNotificationItem = (item)=>{
    //console.log("setNotificationItem", item);
    if(!item.attachment) item.attachment = {};
    if(!item.params) item.params = {};
    notificationItem = item;
  }

  const setItemModal = (item)=>itemModal = item;

  // for projects with only one listed board, automatically go to that board    
  const loadListedBoards = async () => {

    await logPlayerToProject(playerId, projectId);

    const res = await fetch("/api/boardLog?player=" + playerId + "&project=" + projectId + "&listed=true&$embed=board");
    const json = await res.json();
    console.log("loadListedBoards", json);
    boards = json.docs.map(log=>log.board).filter(b=>b); 
  
    if(boards.length == 1) {
      console.log("project has only 1 listed board, using that", boards[0].name);
      currentBoard = boards[0];
    } 
  }

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

  // is called every time whe look at the map
  // todo: optimize for when we have many markers - only receive updated markers and keep old ones
  const loadMarkers = async () => {
    let itemsRes = await fetch("/api/player/" + playerId + "/item?project=" + projectId);
    let itemsJson = await itemsRes.json();
    if(itemsJson.docs)
      markerItems = itemsJson.docs.filter(m=>m.type == "location");
    else 
      markerItems = [];
  }

  const loadDocuments = async () => {
    console.log("loading document items for player", playerId);
    let itemsRes = await fetch("/api/player/" + playerId + "/item?project=" + projectId);
    let itemsJson = await itemsRes.json();
    if(itemsJson.docs) {
      console.log(itemsJson.docs);
      documentItems = itemsJson.docs.filter(m=>m.type == "document");
    }
  }

  const launch = (board) => {
    console.log("launching board", board.name, board._id)
    currentBoard = board;
  }

  const openBoardFromNodeId = async (nodeId)=>{
    showLockScreen = false; // hide lock screen when openening new board
    itemModal = null;
    mainView = "chat";
    let res = await fetch("/api/scriptNode/" + nodeId + "?$embed=board");
    let nodeJson = await res.json();      
    currentBoard = nodeJson.board;
    status = "board open"
  }

  const openBoardForMessage = async (boardId, nodeId)=>{
    showLockScreen = false;
    itemModal = null;
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

  const toggleMenu = () => {
    menuOpen = true;
  }

  const resetPlayerContainer = () => {
    if(loading) return;
    resetPlayer();
    menuOpen = false;
    currentBoard = null;
    mainView = "chat";
  }

  const resetPlayer = async ()=> {
    playerId = await refreshPlayerId();
    registerPlayer(playerId);
  }

  const initPlayerContainerSocket = ()=>{
    console.log("re-initialising socket message listener on player container");
    listenForMessages(async (message)=>{
      //console.log("player container received message");


      // process map commands here
      if(message.params) {
        if(message.params.interfaceCommand == "map") {
          console.log("map command", message.params.interfaceOptions)
          if(message.params.interfaceOptions.arrowTargetItem) {
            arrowMode = true;
            arrowTarget = message.params.interfaceOptions.arrowTargetItem.value
          }
        }
      }

      if(chatMessageHandler) {
        //console.log("handing off to chatMessageHandler");
        chatMessageHandler(message);
      } else {
        console.log("player container: msg received but no chat message handler registered")
        if(!message.forceOpen) {
          if(status != "opening board") {
            setNotificationItem({...message, side: "left"});
            setLockScreen();
            await checkForUnseenMessages();
          }
        } else {
          status = "opening board"
          openBoardFromNodeId(message.node);
        }
      }
    });
  }

  const registerMessageHandler = (handler) => {
    console.log("registerMessageHandler", handler);
    chatMessageHandler = handler
    initPlayerContainerSocket();
  }

  // respond to button presse in menu, modals and archive 
  const handleButton = async (button, item) => {

    console.log("handleButton", button);

    let parts = button.node.split("/"); // button.node is in format "boardName/nodeName"
    if(!parts.length == 2) {
      console.log("handleButton called with bad format", boardAndNode);
      return;
    }

    let boardRes = await fetch("/api/board?key=" + parts[0] + "&project=" + projectId);
    let boardJSON = await boardRes.json();

    if(boardJSON.docs.length != 1) {
      console.log("board not found", parts[0])
      return;
    }

    let nodeRes = await fetch("/api/scriptNode?name=" + parts[1] + "&board=" + boardJSON.docs[0]._id)
    let nodeJSON = await nodeRes.json();

    if(nodeJSON.docs.length != 1) return;

    console.log("node found", nodeJSON);
    
    //joinNode(playerId, nodeJSON.docs[0]._id, true, true, {item, button});
    let res = await fetch("/api/nodeLog/logPlayerToNode/" + playerId + "/" + nodeJSON.docs[0]._id, {
      method: "POST", 
      body: JSON.stringify({item, button})
    });
    let resJSON = await res.json();
    console.log(resJSON);
    if(!resJSON.status == "ok") {
      alert("error moving player");
    }
  
  }

  // proces clicks from menu pages and archive
  const handleHtmlClicks = (event, from) => {
    console.log(event.target);
    let node = event.target.getAttribute('data-node');
    if(node) {
      console.log("handling button press at node " + node)
      handleButton({node}, from)
    }
  }

  // reactive & lifecycle calls


  onMount(async () => {
    
    fileServerURL = await getConfig("fileServerURL");
    
    playerId = await findOrCreatePlayer();
    await initSocket(playerId, updateConnectionStatus);
    //setPlayerId(playerId);
    
    doWhenConnected(()=>{
      initPlayerContainerSocket();  
    })

    let res = await fetch("/api/page/listWithVars?project=" + projectId + "&player=" + playerId + "&key=archive")
    let pages = await res.json();
    console.log(pages)
    if(pages)
      if(pages.docs.length)
        archiveButtonLabel = pages.docs[0].menuEntry

    loading = false;
  });

  // this happens when player is switched or deleted in authoring
  $: {
    console.log("playerContainer: playerId or projectId changed", playerId, projectId);
    if(playerId) {
      loadMarkers();

      if(projectId) {
        loadListedBoards();        
        checkForUnseenMessages();    
      } 
    } else {
      resetPlayerContainer();
    }
  }

</script>

<div class="main-container">

{#if !loading}

  <div class="top-menu {mainView == "chat" ? "highlight" : ""}">
    <button class="menu-button" on:click={toggleMenu}>{"menu"}</button>
    {#if currentBoard && mainView == "chat"}
        {#if boards.length > 1}
          <button style="width: 2em" on:click={()=>{currentBoard = null; loadListedBoards()}}>{"<"}</button>
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
      {#if archiveButtonLabel}
        <button disabled={mainView == "archive"} on:click={openArchive}>{archiveButtonLabel}</button>
      {/if}
      <button disabled={mainView == "map"} on:click={openMap}>map</button>
    </div>
  </div>

  <div class="content-container">
    {#if !currentBoard}
        <ul class="board-select">
          {#each boards as board}
            {#if board}
            <li on:click={()=>{launch(board)}}>
              {board.name} {#if board.description} - {board.description} {/if}
              {#if board.unSeenMessages } <small>(unread messages: {board.unSeenMessages})</small> {/if} 
            </li>
            {/if}
          {/each}
        </ul>
    {:else}
        <Chat
          {playerId}
          {projectId}
          {currentBoard}
          {openBoardFromNodeId}
          updateUnseenMessages={checkForUnseenMessages}
          mapClick={openMapTo}
          {setNotificationItem}
          {showLockScreen}
          {setLockScreen}
          {mainView}
          {setEditNodeId}
          {authoring}
          {updatePlayerNodeId}
          {registerMessageHandler}
          {displayAlert}
          openChatView={()=>{openChat(); itemModal = null}}
        />
      {/if}
  </div>

  <Map
    bind:map={map}
    {googleReady}
    visible={mainView=="map"}
    {markerItems}
    {setItemModal}
    {arrowMode}
    {arrowTarget}
    {arrowDirection}
  />

  {#if mainView == "archive"}
  <Archive
    visible={true}
    items={documentItems}
    {setItemModal}
    {projectId}
    {playerId}
    {handleHtmlClicks}
  />
  {/if}

  {#if itemModal}
    <Modal
      visible={true}
      item={itemModal}
      {fileServerURL}
      onClose={() => itemModal = null}
      {handleButton}
    />
  {/if}

  {#if showAlert}
  <Alert
    close={() => showAlert = null}
    {alertOptions}
  />
  {/if}

  {#if showLockScreen}
  <LockScreen
    {notificationItem}
    visible={true}
    onClose={()=>{
      showLockScreen = false;
      notificationItem = null;
    }}
    {openBoardForMessage}
  />
  {/if}

  {#if menuOpen}
  <Menu
    {projectId}
    {playerId}
    {resetPlayerContainer}
    onClose={()=>menuOpen=false}
    toggelDebugPanel={()=>debugPanelOpen = true}
    {handleHtmlClicks}
  />
  {/if}

  {#if debugPanelOpen && playerId}
    <DebugPanel
      {playerId}
      {projectId}
      {authoring}
      {socketConnectionStatus}
      close={()=>{menuOpen = false; debugPanelOpen = false}}
    />
  {/if}

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

  .top-menu button {
    box-shadow: 2px 2px #ddd;
  }

  .menu-button {
    margin-right: 2px;
    color: #000;
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


