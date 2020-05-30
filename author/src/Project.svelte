<script>
  import { onMount, onDestroy } from 'svelte';

  import Board from './Board.svelte';
  import EditNode from './EditNode.svelte';
  import PlayerInfo from './PlayerInfo.svelte';
  
  import {token} from './stores.js';

  import Chat from '../../shared/Chat.svelte';
  import { initSocket } from '../../shared/socketClient.js';

  onMount(() => {
     initSocket();
  });

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

  export let projectId;

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


  let playerInfoOpen = false;
  let playerId;

  const togglePlayerInfo = (newPlayerId) => {
    playerInfoOpen = true;
    playerId = newPlayerId;
  }

</script>


<div id="left" class="area">
  <Board
    {currentBoardId}
    {setCurrentBoardId}
    {currentBoardData}
    {setCurrentBoardData}
    {editNodeId}
    {setEditNodeId}
    {playerNodeId}
    {projectId}
    {createNode}
  />
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
  {#if playerNodeId}
    
    <Chat
      {playerNodeId}
      {setPlayerNodeId}
      {setEditNodeId}
      authoring={true}
      {togglePlayerInfo}
    />

    {#if playerInfoOpen && playerId}
      <PlayerInfo
        {playerId}
        {playerNodeId}
        close={()=>playerInfoOpen = false}
      />
    {/if}

  {/if}
</div>




<style>

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
    padding-top: 50px;
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

  button.player-info {
    position: absolute;
    right: 10px;
    top: 10px;
    z-index: 100;
  }


</style>

