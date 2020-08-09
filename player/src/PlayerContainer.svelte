<script>
  import { onMount } from 'svelte';
  import { getConfig, findOrCreatePlayer, logPlayerToProject, refreshPlayerId, postPlayerMessage, getPlayerVar, persistPlayerId } from '../../shared/util.js';
  import { initSocket, registerPlayer, listenForMessages, doWhenConnected } from '../../shared/socketClient.js';
  
  import Chat from './Chat.svelte';
  import Map from './Map.svelte';
  import Archive from './Archive.svelte';
  import Modal from './Modal.svelte';
  import DynamicModal from './DynamicModal.svelte';
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
  export let setEditNodeId = ()=>{}
  export let updatePlayerNodeId; // for tellig the authoring system when player has moved to new node
  export let googleReady;
  
  let boards = [];
  let currentBoard = null; // if this is set, the chat is open
  
  let numUnseenMessages = 0;

  let map;
  let markerItems;
  let documentItems;
  let arrowMode = false;
  let arrowTarget = null;
  let arrowDirection = 0;

  let chatMessageHandler = null;
  
  let mainView = "chat";
  let itemModal = null;
  
  let dynamicModalPage = null;
  let dynamicModalParameter = null;

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

  // load persistent interface state from player variable
  const loadInterfaceState = async ()=> {
    let interfaceState = await getPlayerVar({playerId, projectId}, "interfaceState")
    console.log("interfaceState", interfaceState);

    if(interfaceState) {
      if("arrowMode" in interfaceState) arrowMode = interfaceState.arrowMode;
      if("arrowTarget" in interfaceState) arrowTarget = interfaceState.arrowTarget;
      if("arrowDirection" in interfaceState) arrowDirection = interfaceState.arrowDirection;
    }
  }

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

    await checkForUnseenMessages();    
  }

  const checkForUnseenMessages = async () => {
    console.log("checkForUnseenMessages")
    let numUnseen = 0;
    for(let i = 0; i < boards.length; i++) {
      let board = boards[i];
      const query = {
        board: board._id, 
        recipients: playerId,
        scheduled: {"$ne": true},
        seen: {"$nin": [playerId]}
      };
      //console.log(query)
      const res = await fetch("/api/message?$where=" + JSON.stringify(query));
      const mjson = await res.json();
      const messages = mjson.docs.filter(m=>{
        if(m.params) 
          return !m.params.interfaceCommand 
        else
          return true
      });
      //console.log("unseen", boards[i].name, messages);
      numUnseen += messages.length
      boards[i] = {...board, unSeenMessages: messages.length}
    }
    boards = boards;
    numUnseenMessages = numUnseen;
    console.log("unseen:" + numUnseen);
  }

  const openMapTo = async (chatItem) => {
    console.log(chatItem);
    mainView = "map";
    await loadMarkers();
    map.panTo(chatItem.attachment);
    map.setZoom(17);  
  }

  // is called every time whe look at the map
  // todo: optimize for when we have many markers - load geographically
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
    console.log("openBoardFromNodeId", nodeId)
    showLockScreen = false; // hide lock screen when openening new board
    itemModal = null;
    dynamicModalPage = null;
    mainView = "chat";
    let res = await fetch("/api/scriptNode/" + nodeId + "?$embed=board");
    let nodeJson = await res.json();      
    console.log("currentBoard is", currentBoard ? currentBoard.key : null)
    currentBoard = null;
    currentBoard = nodeJson.board;
    console.log("loading", loading)
    console.log("set currentBoard to", currentBoard.key);
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
    boards = [];
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


      // process some interface commands here
      if(message.params) {
        if(message.params.interfaceCommand == "updateBoards") {
          console.log("updateBoard command")
          loadListedBoards();  
        }

        if(message.params.interfaceCommand == "updateMap") {
          console.log("updateMap command")
          loadMarkers();
        }

        if(message.params.interfaceCommand == "map") {
          console.log("map command", message.params.interfaceOptions)
          arrowMode = message.params.interfaceOptions.arrowMode;
          arrowTarget = message.params.interfaceOptions.arrowTarget
          arrowDirection = message.params.interfaceOptions.arrowDirection;
        }
      }

      if(chatMessageHandler) {
        //console.log("handing off to chatMessageHandler");
        if(status != "opening board") {
          chatMessageHandler(message);
        } else {
          console.log("ignoring socket message while board is opening")
        }
      } else {
        console.log("player container: msg received but no chat message handler registered", message)
        if(!message.params) message.params = {}
        if(message.forceOpen || message.params.interfaceCommand == "request-geoposition") {
          if(status != "opening board") {
            status = "opening board"
            openBoardFromNodeId(message.node);
          }
        } else {
          if(status != "opening board") {
            await checkForUnseenMessages();
          }
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
    
    let res = await fetch("/api/nodeLog/logPlayerToNode/" + playerId + "/" + nodeJSON.docs[0]._id, {
      method: "POST", 
      body: JSON.stringify({item, button})
    });
    let resJSON = await res.json();
    //console.log(resJSON);
    if(!resJSON.status == "ok") {
      alert("error moving player");
    }
  
  }

  let readyForClick = true

  // process clicks from menu pages and archive
  const handleHtmlClicks = async (event, from) => {
    
    // prevent multiple fast clicks
    if(!readyForClick) {
      console.log("multiple button click, aborting")
      return;
    } else {
      readyForClick = false;
    }

    // do the things
    console.log(event.target);

    dynamicModalParameter = event.target.getAttribute('data-parameter');
    
    // button with moveTo effect
    let node = event.target.getAttribute('data-node');
    if(node) {
      console.log("handling button press at node " + node)
      handleButton({node, parameter: dynamicModalParameter}, from)
      menuOpen = false;
    }

    // button to open board
    let boardKey = event.target.getAttribute('data-board');
    if(boardKey) {
      console.log("opening board " + boardKey)
      
      let boardRes = await fetch("/api/board?key=" + boardKey + "&project=" + projectId);
      let boardJSON = await boardRes.json();

      if(boardJSON.docs.length != 1) {
        console.log("board not found", parts[0])
        return;
      }
      currentBoard = boardJSON.docs[0];
      menuOpen = false;
      dynamicModalPage = null;
    }
    
    // button to open dynamicModal
    let modalPage = event.target.getAttribute('data-modal-page');
    if(modalPage) {
      dynamicModalPage = modalPage
    }

    // button to reset player
    if(event.target.getAttribute('data-special') == "resetPlayer") {
      if(confirm("really?")) resetPlayerContainer()
    }

    // button to open debug panel
    if(event.target.getAttribute('data-special') == "debugPanel") {
      debugPanelOpen = true;
    }

    // reset clickreadyness
    setTimeout(()=>readyForClick = true, 500);
  }

  // reactive & lifecycle calls


  onMount(async () => {

    fileServerURL = await getConfig("fileServerURL");
    
    if(!playerId) {
      playerId = await findOrCreatePlayer();
    } else {
      persistPlayerId(playerId)
    }
    
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

  const initProject = async () => {
    loadInterfaceState();
    await loadListedBoards();        
  }

  // this happens when player is switched or deleted in authoring
  $: {
    console.log("playerContainer: playerId or projectId changed", playerId, projectId);
    if(playerId) {
      currentBoard = null;
      loadMarkers();

      if(projectId) {
        initProject();
      } 
    } else {
      resetPlayerContainer();
    }
  }

</script>

<div class="main-container">

{#if !loading}

  <div class="top-menu {mainView == "chat" ? "highlight" : ""}">
  
    {#if currentBoard && mainView == "chat" && boards.length > 1}
      <div class="breadcrumbs">
        <button class="button-back" style="width: 2em" on:click={()=>{currentBoard = null; loadListedBoards()}}>
          {"<"}
        </button>
        <span
          class="breadcrumb"
          on:click={ () => { if (mainView!="chat") mainView="chat"; }}
        >
          {currentBoard.name}
        </span>
      </div>
    {:else}
      <button class="menu-button" on:click={toggleMenu}>
        <span>{"menu"}</span>
      </button>
    {/if}

    <div class="menu-buttons-right">
      <button class="button-chat" disabled={mainView == "chat"} on:click={openChat}>
        <span>
          chat 
        </span>
        {#if numUnseenMessages > 0}
          <mark class="unseen">
            {numUnseenMessages}
          </mark>
        {/if}        
      </button>
      {#if archiveButtonLabel}
        <button class="button-archive" disabled={mainView == "archive"} on:click={openArchive}>
          <span>{archiveButtonLabel}</span>
        </button>
      {/if}
      <button class="button-map" disabled={mainView == "map"} on:click={openMap}>
        <span>map</span>
      </button>
    </div>
  </div>

  <div class="content-container">
    {#if !currentBoard}
        <ul class="board-select">
          {#each boards as board}
            {#if board}
            <li class="board" on:click={()=>{launch(board)}}>
              <h3 class="board-name">
                {board.name} 
              </h3>
              {#if board.description}
                <p class="board-description">
                  {board.description} 
                </p>
              {/if}
              <small class="board-unseen {board.unSeenMessages || "no-messages"}">
                {#if board.unSeenMessages } 
                  {board.unSeenMessages} neue Nachrichten
                {:else}
                  Keine neuen Nachrichten
                {/if} 
              </small> 
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
          {showLockScreen}
          {setLockScreen}
          {mainView}
          {setEditNodeId}
          {authoring}
          {updatePlayerNodeId}
          {registerMessageHandler}
          {displayAlert}
          openChatView={()=>{openChat(); itemModal = null; dynamicModalPage = null;}}
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

  {#if dynamicModalPage}
    <DynamicModal
      {dynamicModalPage}
      {dynamicModalParameter}
      {handleHtmlClicks}
      {projectId}
      {playerId}
      onClose={() => dynamicModalPage = null}
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
    onClose={()=>menuOpen=false}
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






<style type="text/scss">

  button {
  }

  button:disabled,
  button[disabled] {

  }

  .main-container {
    position: relative;
    width: 100%;
    height: 100%;
    box-sizing: border-box;
  }

  .top-menu {
    height: 70px;
    position: absolute;
    top: 0;
    left: 0;
    padding: 10px;
    width: 100%;
    box-sizing: border-box;
    z-index: 10;
    display: flex;
    align-items: stretch;
    justify-content: space-between;
  }

  .highlight {
    border-bottom: 1px solid;
  }

  .menu-buttons-right {
  
    display: flex;
  
    [class^=button] {
      border: none;
      background-color: transparent;
      background-image: url("/assets/Menu-bg-Normal.svg");
      &:hover, &[disabled] {
        background-image: url("/assets/Menu-bg-Active.svg");
      }
      background-size: cover;
      background-repeat: no-repeat;
      background-position-x: 50%;

      border: solid 1px var(--color-dark);
      border-width: 0 1px 0 1px;
      border-radius: 0;

      &:first-child {
        background-position-x: 0%;
        border:none;
      }
      &:last-child {
        background-position-x: 100%;
        border:none;
      }

      width: 61px;
      height: 48px;
      position: relative;
      
      span {
        color: transparent;
        display: inline-block;
        background-repeat: no-repeat;
        background-size: contain;    
        line-height: 20px;
        position: relative;
      }

      .unseen {
        position: absolute;
        top:1px;
        right:0;
        color: var(--color-dark);
        background-color: var(--color-orange);
        padding: 0 4px;
        font-size: 12px;
      }
    }

    .button-chat {
      span {
        background-image: url("/assets/icons/Chat.svg"); 
        top: 0.05em;
        left: 0.4em;
      }
      &:hover span, &:active span,  &[disabled] span {
        background-image: url("/assets/icons/Chat-white.svg");
      }   
    }
  }

  .button-archive {
    span {
      background-image: url("/assets/icons/Boat.svg");    
      top: 0em;
      left: 0.4em;    
    }
    &:hover span, &[disabled] span {
      background-image: url("/assets/icons/Boat-white.svg");
    }    
  }

  .button-map {
    span {
      background-image: url("/assets/icons/Map.svg");     
      top: 0;
      left: 0.2em;
    }
    &:hover span, &[disabled] span {
      background-image: url("/assets/icons/Map-white.svg");
    }   
  }

  .menu-button, .breadcrumbs {
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: var(--letter-spacing-bold);
    font-size:14px;
  }

  .menu-button {
    border: none;
    background: transparent url("/assets/icons/Menu.svg") no-repeat 0 50%;
    padding-left: 30px;
    margin-left: 25px;
    cursor: pointer;
  }

  .breadcrumbs {
    .button-back {
      height: 100%;
      padding-right: 2em;
      background: transparent  url("/assets/icons/Arrow _-.svg") no-repeat  0 50%;      
      color: transparent;
      border: none;
      margin: 0;
      cursor: pointer;
    }
  }

  .content-container {
    position: absolute;
    top: 70px;
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

  .board-select .board {
    list-style: none;
    padding: 24px;
    background: transparent url("/assets/icons/Arrow -_.svg") no-repeat 100% 50%;
    cursor: pointer;
    +li {
      border-top: 1px solid lightgray;
    }

    .board-name {
      font-weight: bold;
      letter-spacing: var(--letter-spacing-bold);
      text-transform: uppercase;
      font-size: 18px;
      line-height: 21px;
      margin: 0 0 3px 0;
    }

    .board-unseen {
      display: block;
      font-size: 15px;
      line-height: 18px;
      &:not(.no-messages) {
        color: var(--color-orange);
      }
    }
  }

  ul.board-select li:last-child {
    border-bottom: 1px solid lightgray; 
  }


</style>


