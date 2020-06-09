<script>

  import { onMount, onDestroy } from 'svelte';

  import {token} from './stores.js';
  import { initSocket, joinRoom, getPlayerId, refreshPlayerId } from '../../shared/socketClient.js';
  import { getConfig } from '../../shared/util.js';

  import Board from './Board.svelte';
  import EditNode from './EditNode.svelte';
  import PlayerMonitoring from './PlayerMonitoring.svelte';
  import AttachmentManager from './AttachmentManager.svelte'; 
  import ItemManager from './ItemManager.svelte';
  import PageManager from './PageManager.svelte';
  import PlaytestArea from './PlaytestArea.svelte';

  import WorkspaceFrame from './WorkspaceFrame.svelte';
  
  export let project;
  export let close;
  export let googleReady;

  let editNodeId = null;
  const setEditNodeId = async (nodeId)=>{
    const res = await fetch("/api/scriptNode/" + nodeId);
    const json = await res.json();
    
    if(!currentBoardData || currentBoardData._id != json.board) {
      currentBoardId = json.board;  
      loadBoardData()
    }
    
    editNodeId = nodeId
    
  };

  let playerNodeId = null;
  const setPlayerNodeId = (nodeId)=>{
    playerNodeId = nodeId

    // register player on server and allow rejoin
    joinRoom(playerNodeId, true, true);
  };

  const updatePlayerNodeId = (nodeId)=>{
    playerNodeId = nodeId
  }

  let currentBoardId = null;
  const setCurrentBoardId = (boardId)=>{currentBoardId = boardId};

  let currentBoardData = null;
  const setCurrentBoardData = (boardData)=>{
    currentBoardData = boardData;
  }
  const reloadBoardData = ()=>{
    //if(currentBoardData) currentBoardData.expired = true;
    loadBoardData();
  }

  let playerId;
  
  const clearPlayerId = async (id)=> {
    if(id == playerId) {
      playerNodeId = null;
      playerId = null; // set to null first so attached player resets
      playerId = await refreshPlayerId();
    }
  }

  let boards = [];
  let playerURL;
  let editMode = false;
  
  let tabNavigation = "boards";
  const toggleTab = (tab) => {if(tabNavigation == tab) tabNavigation = "boards"; else tabNavigation = tab}
  const closeTab = ()=>{tabNavigation = "boards"}

  const loadBoardList = async ()=>{
    const res = await fetch("/api/board?project=" + project._id);
    const json = await res.json();
    boards = json.docs;
    playerURL = await getConfig("playerURL");
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
    } else {
      setCurrentBoardData(null);
    }
  }

  const createBoard = ()=>{
    let newBoard = {
      new: true,
      name: "",
      scriptNodes: [],
      library: "",
      project: project._id
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

function onMessage() {
  
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
     await initSocket();
     playerId = getPlayerId();
     console.log("playerId set for project workspace", playerId);
     loadBoardList();
  });


</script>

<WorkspaceFrame>

  <div slot="left-top-menu">
    
    <div class="project-title">
        <h2>{project.name}</h2>
        <button on:click={close}>close</button><br>
    </div>


    <button class="project-menu-toggle" on:click={()=>{toggleTab("pages")}}>📄</button>
    <button id="toggle-player-monitoring" on:click={()=>{toggleTab("players")}}>👥</button>
    <button id="toggle-item-manager" on:click={()=>{toggleTab("items")}}>🧳</button>
    <button id="toggle-attachment-manager" on:click={()=>{toggleTab("attachments")}}>📎</button>
    
    
    <select bind:value={currentBoardId} on:change={loadBoardData}>
      <option value={null}>select a board</option>
      <option disabled>_________</option>
    {#each boards as board}
      <option value={board._id}>{board.name}</option>
    {/each}
      <option disabled>_________</option>
      <option value={"new"}>new board</option>
    </select>

  </div>

  <div slot="left-work-area">

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
        {playerURL}
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
        {clearPlayerId}
        {playerId}
        close={closeTab}
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
      {setPlayerNodeId}
      {reloadBoardData}
      {currentBoardData}
      {createNode}
    />
    {/if}
  </div>

  <div slot="horizontal-divider">
    <a target="_blank" href="{playerURL}?project={project._id}">external player</a>
  </div>

  <div slot="bottom-right-work-area" class="h100">
    <PlaytestArea
      projectId={project._id}
      {playerId}
      {clearPlayerId}
      {playerNodeId}
      {updatePlayerNodeId}
      {setEditNodeId}
      {googleReady}
    />
  </div>

</WorkspaceFrame>


<style>

  .project-title {
    position: absolute;
    z-index: 20;
    text-align: left;
  }

  .project-title button {
    vertical-align: top;
    margin-left: 5px;
  }


  h2 {
    display: inline-block;
    margin: 0px;
    margin-top: 3px;
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

</style>

