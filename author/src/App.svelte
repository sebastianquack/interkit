<script>
  import { onMount, onDestroy } from 'svelte';

  import Board from './Board.svelte';
  import EditNode from './EditNode.svelte';
  
  import Login from './Login.svelte';
  import Logout from './Logout.svelte';
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

</script>


{#if $token}

  <div id="left" class="area">
    <Logout/>
    <Board
      {currentBoardId}
      {setCurrentBoardId}
      {currentBoardData}
      {setCurrentBoardData}
      {editNodeId}
      {setEditNodeId}
      {playerNodeId}
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
    />
    {/if}
  </div>

{:else}

  <Login/>

{/if}



<style>

  .area {
    box-sizing: border-box;
    position: absolute;
    padding: 5px;
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

