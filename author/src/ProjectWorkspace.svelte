<script>
  import { onMount, onDestroy } from 'svelte';

  import {token} from './stores.js';
  import { initSocket } from '../../shared/socketClient.js';
  import { getConfig } from '../../shared/util.js';

  import Board from './Board.svelte';
  import EditNode from './EditNode.svelte';
  import PlayerMonitoring from './PlayerMonitoring.svelte';
  import AttachmentManager from './AttachmentManager.svelte'; 
  import PlaytestArea from './PlaytestArea.svelte';
  
  export let project;
  export let close;

  
  let editNodeId = null;
  const setEditNodeId = (nodeId)=>{editNodeId = nodeId};

  let playerNodeId = null;
  const setPlayerNodeId = (nodeId)=>{playerNodeId = nodeId};

  let currentBoardId = null;
  const setCurrentBoardId = (boardId)=>{currentBoardId = boardId};

  let currentBoardData = null;
  const setCurrentBoardData = (boardData)=>{
    currentBoardData = boardData;
  }
  const reloadBoardData = ()=>{
    if(currentBoardData) currentBoardData.expired = true;
  }

  let playerId;
  const setPlayerId = (id)=>{playerId=id}
  const clearPlayerId = (id)=> {
    if(id == playerId) {
      playerId = null; 
      playerNodeId = null;
    }
  }

  let boards = [];
  let playerURL;
  let editMode = false;
  let tabNavigation = "boards";
  const toggleTab = (tab) => {if(tabNavigation == tab) tabNavigation = "boards"; else tabNavigation = tab}
  
  const loadBoardList = async ()=>{
    const res = await fetch("/api/board?project=" + project._id);
    const json = await res.json();
    boards = json.docs;
    playerURL = await getConfig("playerURL");
  }

  const loadBoardData = async ()=>{
    console.log("reloading board data", currentBoardId);
    editMode = false;
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
        headers: {'authorization': $token},
        body: JSON.stringify(newNode)
    });
    if(response.ok) {
      let json = await response.json();
      console.log(json);
      return json._id;
    }
  }

  onMount(() => {
     initSocket();
     loadBoardList();
  });


</script>

  
<div id="left" class="area">

  <div class="left-top-menu">

    <div class="project-title">
        <h2>{project.name}</h2>
        <button on:click={close}>close</button>
    </div>


    <button id="toggle-player-monitoring" on:click={()=>{toggleTab("players")}}>👥</button>
    <button id="toggle-attachment-manager" on:click={()=>{toggleTab("attachments")}}>📎</button>
    
    <select bind:value={currentBoardId} on:change={loadBoardData}>
      <option value={null}>select a board</option>
      <option disabled>_________</option>
    {#each boards as board}
      <option value={board._id}>{board.name}</option>
    {/each}
    </select>
    <button on:click={createBoard}>new board</button>

    {#if currentBoardData && !currentBoardData.new}
      <button on:click={deleteBoard}>delete board</button> 
    {/if}

  </div>

  <div class="left-work-area">

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
    />
    {/if}

    {#if tabNavigation == "attachments"}
      <AttachmentManager
          projectId={project._id}
          close={()=>{tabNavigation = "boards"}}
        />
    {/if}

    {#if tabNavigation == "players"}
      <PlayerMonitoring
        projectId={project._id}
        {clearPlayerId}
        close={()=>{tabNavigation = "boards"}}
      />
    {/if}

  </div>


</div>

<div id="top-right" class="area">
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

<div id="bottom-right" class="area">

  <PlaytestArea
    {playerId}
    {setPlayerId}
    {clearPlayerId}
    {playerNodeId}
    {setPlayerNodeId}
    {setEditNodeId}
  />

</div>




<style>

  .left-top-menu {
    position: absolute;
    top: 0px;
    left: 0px;
    background-color: #fff;
    width: 100%;
    text-align: right;
    padding: 10px 10px 0px 10px;
    z-index: 10;
    border-bottom: 4px solid gray;
    box-sizing: border-box;
  }

  .project-title {
    position: absolute;
    z-index: 20;
  }


  h2 {
    display: inline-block;
    margin: 0px;
    margin-top: 2px;
  }


  #toggle-attachment-manager {
    margin-right: 10px;
  }

  .left-work-area {
    position: absolute;
    left: 0;
    top: 50px;
    bottom: 0;
    width: 100%;
    padding: 10px;
    box-sizing: border-box;
  }

  .area {
    box-sizing: border-box;
    position: absolute;
    padding: 10px;
  }

  #left {
    top: 0;
    left: 0;
    height: 100vh;
    width: 50%; 
    z-index: 0;
  }

  #top-right {
    width: 50%;
    height: 50vh;
    overflow-y: auto;    
    top: 0;
    right: 0;
    border-left: 4px solid gray;
    border-bottom: 4px solid gray;
  }

  #bottom-right {
    width: 50%;
    height: 50vh;
    bottom: 0;
    right: 0;
    border-left: 4px solid gray;
  }

</style>

