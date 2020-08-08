<script>

  import { onMount, onDestroy } from 'svelte';

  import {token, boardCodeChanged } from './stores.js';
  //import { initSocket, registerPlayer } from '../../shared/socketClient.js';
  import { getConfig, /*findOrCreatePlayer, refreshPlayerId*/ } from '../../shared/util.js';

  import Board from './Board.svelte';
  import EditNode from './EditNode.svelte';
  import PlayerMonitoring from './PlayerMonitoring.svelte';
  import AttachmentManager from './AttachmentManager.svelte'; 
  import ItemManager from './ItemManager.svelte';
  import PageManager from './PageManager.svelte';
  import PlayerContainer from '../../player/src/PlayerContainer.svelte';

  import WorkspaceFrame from './WorkspaceFrame.svelte';
  
  export let project;
  export let close;
  export let googleReady;

  let editNodeId = null;
  const setEditNodeId = async (nodeId)=>{
    console.log("setEditNodeId", nodeId)

    if(nodeId) {
      const res = await fetch("/api/scriptNode/" + nodeId);
      const json = await res.json();

      console.log("loaded node", json)
      
      if(!currentBoardData || currentBoardData._id != json.board) {
        currentBoardId = json.board;  
        loadBoardData()
      }
    }
    
    editNodeId = nodeId
    
  };

  let playerNodeId = null;

  const updatePlayerNodeId = (nodeId)=>{
    console.log("updatePlayerNodeId", nodeId);
    playerNodeId = nodeId
  }

  let currentBoardId = null;
  let currentBoardIdSelect = null;
  const setCurrentBoardId = (boardId)=>{
    console.log("setCurrentBoardId"); 
    currentBoardId = boardId;
    currentBoardIdSelect = currentBoardId;
  };

  let currentBoardData = null;
  const setCurrentBoardData = (boardData)=>{
    currentBoardData = boardData;
  }
  const reloadBoardData = ()=>{
    //if(currentBoardData) currentBoardData.expired = true;
    loadBoardData();
  }

  let playerId;
  let boards = [];
  let playerURL;
  let editMode = false;
  
  let tabNavigation = "boards";
  const toggleTab = (tab) => {
    if($boardCodeChanged) {
      alert("unsaved code changes")
      return
    }
    if(tabNavigation == tab) 
      tabNavigation = "boards"; 
    else tabNavigation = tab
  }
  const closeTab = ()=>{tabNavigation = "boards"}

  const loadBoardList = async ()=>{
    const res = await fetch("/api/board?project=" + project._id);
    const json = await res.json();
    boards = json.docs;
    playerURL = await getConfig("playerURL");
  }

  const checkBoardSelect = ()=> {
    if($boardCodeChanged) {
      currentBoardIdSelect = currentBoardId
      alert("unsaved code changes")
      return;
    }

    // get value from select element
    currentBoardId = currentBoardIdSelect;

    loadBoardData();
  }

  const loadBoardData = async ()=>{
    
    if(currentBoardId == "new") {
      createBoard();
      return;
    }

    console.log("reloading board data", currentBoardId);
    editMode = false;
    tabNavigation = "boards";
    if(currentBoardId) {
      const res = await fetch("/api/board/" + currentBoardId + "?$embed=scriptNodes");
      const json = await res.json();
      setCurrentBoardData(json);
      currentBoardIdSelect = currentBoardId;
      if(!json.startingNode) {
        alert("warning: no starting node set");
      }
    } else {
      setCurrentBoardData(null);
    }
  }

  const createBoard = ()=>{
    let newBoard = {
      new: true,
      key: "",
      name: "",
      scriptNodes: [],
      library: "",
      project: project._id,
      listed: true
    }
    setCurrentBoardData(newBoard);
    editMode = true;
  }

  const deleteBoard = async ()=>{
    if(confirm("really?")) {
      await fetch("/api/board/" + currentBoardData._id, {
        method: "DELETE",
        headers: {'authorization': $token},
      });
      loadBoardList();
      closeBoard();
    }
  }

  const closeBoard = ()=>{
    setCurrentBoardData(null);  
    setEditNodeId(null);
  }

  // this is here because new nodes can be created from board and from editor
  const createNode = async (name, boardId)=>{

    let newNode = {
      name: name,
      board: boardId,
      script: `function onArrive() {

}

function onReceive(input) {
  
}`,
      multiPlayer: false,
      posX: 100,
      posY: 100
    }
    let response = await fetch("/api/scriptNode", {
        method: "POST",
        headers: {
          'authorization': $token,
          'Content-Type': 'application/json'
          },
        body: JSON.stringify(newNode)
    });
    if(response.ok) {
      let json = await response.json();
      console.log(json);
      return json._id;
    }
  }

  onMount(async () => {
    //playerId = await findOrCreatePlayer();
    //await initSocket(playerId);
    //console.log("playerId set for project workspace", playerId);
    loadBoardList();
  });

  

</script>

<WorkspaceFrame>

  <div slot="left-top-menu" id="toolbar">
    
    <div class="project-title">
      <button on:click={close}>&lt;</button>
      <h2 title={project.name}>{project.name}</h2>
    </div>

    <div class="board-controls">
      <button class="project-menu-toggle" class:active={tabNavigation == "pages"} on:click={()=>{toggleTab("pages")}} title="pages">📄</button>
      <button id="toggle-player-monitoring" class:active={tabNavigation == "players"} on:click={()=>{toggleTab("players")}} title="players">👥</button>
      <button id="toggle-item-manager" class:active={tabNavigation == "items"} on:click={()=>{toggleTab("items")}} title="items">🧳</button>
      <button id="toggle-attachment-manager" class:active={tabNavigation == "attachments"} on:click={()=>{toggleTab("attachments")}} title="attachments">📎</button>
      <button id="open-board" class:active={tabNavigation == "boards"} on:click={()=>{toggleTab("boards")}} title="boards">🗂</button>
        
      <select bind:value={currentBoardIdSelect} on:change={checkBoardSelect}>
        <option value={null}>select a board</option>
        <option disabled>_________</option>
      {#each boards as board}
        <option value={board._id}>{board.name}</option>
      {/each}
        <option disabled>_________</option>
        <option value={"new"}>new board</option>
      </select>

    </div>

  </div>

  <div slot="left-work-area" style="height: 100%; overflow-y: scroll">

    {#if tabNavigation == "boards"}    
      <Board
        {currentBoardId}
        {setCurrentBoardId}
        {currentBoardData}
        {setCurrentBoardData}
        {editNodeId}
        {setEditNodeId}
        {playerNodeId}
        projectId={project._id}
        {createNode}
        {loadBoardData}
        {loadBoardList}
        {deleteBoard}
      />
      {/if}

    {#if tabNavigation == "attachments"}
      <AttachmentManager
          projectId={project._id}
          close={closeTab}
        />
    {/if}

    {#if tabNavigation == "items"}
      <ItemManager
          projectId={project._id}
          close={closeTab}
          {playerId}
          {googleReady}
        />
    {/if}

    {#if tabNavigation == "players"}
      <PlayerMonitoring
        projectId={project._id}
        dropConnectedPlayerId={()=>playerId = null}
        {playerId}
        setPlayerId = {(id)=>playerId = id}
      />
    {/if}

    {#if tabNavigation == "pages"}
      <PageManager
        projectId={project._id}
        close={closeTab}
      />
    {/if}

  </div>

  <div slot="top-right-work-area" class="h100">
    {#if editNodeId}
    <EditNode
      {editNodeId}
      {setEditNodeId}
      {reloadBoardData}
      {currentBoardData}
      {createNode}
      {playerId}
      projectId={project._id}
    />
    {/if}
  </div>

  <div slot="horizontal-divider">
    <a target="_blank" href="{playerURL}?project={project._id}">external player</a>
  </div>

  <div slot="playtest-area" class="h100">
    <PlayerContainer
      projectId={project._id}
      bind:playerId={playerId}
      {setEditNodeId}
      authoring={true}
      {updatePlayerNodeId}
      {googleReady}
    />
  </div>

</WorkspaceFrame>


<style>

  #toolbar {
    display: flex;
    justify-content: space-between;
    overflow: hidden;
    align-items: baseline;
  }

  .project-title {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .board-controls {
    white-space: nowrap;
  }

  .project-title button {
    vertical-align: top;
    margin-left: 5px;
  }

  h2 {
    display: inline;
  }

  #toggle-attachment-manager {
    margin-right: 10px;
  }

  .h100 {
    height: 100%;
    width: 100%;
    box-sizing: border-box;
  }

  a {
    color: gray;
    padding-left: 1px;
    margin-bottom: 10px;
    position: relative;
    font-size: 10px;
    font-weight: normal;
  }

  .active {
    border: 2px solid gray;
  }

</style>

