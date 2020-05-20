<script>

  import { onMount } from 'svelte';
  
  import { getConfig } from '../../shared/util.js';

  import { token } from './stores.js';  
  import CodeEditor from './CodeEditor.svelte';
  import NodeGraph from './NodeGraph.svelte';
  import AttachmentManager from './AttachmentManager.svelte'; 

  export let currentBoardId;
  export let setCurrentBoardId;

  export let currentBoardData;
  export let setCurrentBoardData;

  export let setEditNodeId;  
  export let editNodeId;

  export let playerNodeId;
  export let projectId;

  export let createNode;
  
  let boards = [];
  let editMode = false;
  let playerURL;

  const loadBoardList = async ()=>{
    const res = await fetch("/api/board?project=" + projectId);
    const json = await res.json();
    boards = json.docs;
    playerURL = await getConfig("playerURL");
  }
  
  const loadBoardData = async ()=>{
    //console.log("reloading board data", currentBoardId);
    editMode = false;
    if(currentBoardId) {
      const res = await fetch("/api/board/" + currentBoardId + "?$embed=scriptNodes");
      const json = await res.json();
      setCurrentBoardData(json);
    } else {
      setCurrentBoardData(null);
    }
  }

  $: {
    if(currentBoardId && currentBoardData && currentBoardData.expired)
     loadBoardData();
  }

  const closeBoard = ()=>{
    setCurrentBoardData(null);  
    setEditNodeId(null);
    editMode = false;
  }

  const createBoard = ()=>{
    let newBoard = {
      new: true,
      name: "",
      scriptNodes: [],
      library: "",
      project: projectId
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

  const saveBoard = async ()=>{
    let response;
    
    if(currentBoardData.new) {
      response = await fetch("/api/board", {
        method: "POST",
        headers: {'authorization': $token},
        body: JSON.stringify([{
          name: currentBoardData.name,
          description: currentBoardData.description,
          listed: currentBoardData.listed,
          library: currentBoardData.library,
          project: projectId
        }])
      });
      if(response.ok) {
        let json = await response.json();
        console.log(json);
        setCurrentBoardData(json[0]);
        editMode = false;
      }
    } else {
      response = await fetch("/api/board/" + currentBoardData._id, {
        method: "PUT",
        headers: {'authorization': $token},
        body: JSON.stringify({
          _id: currentBoardData._id,
          name: currentBoardData.name,
          description: currentBoardData.description,
          listed: currentBoardData.listed,
          library: currentBoardData.library,
          project: projectId
        })
      });
      if(response.ok) {
        let json = await response.json();
        console.log(json);
        json.scriptNodes = currentBoardData.scriptNodes;
        setCurrentBoardData(json);
        editMode = false;
      }
    }

    await loadBoardList();
    setCurrentBoardId(currentBoardData._id);
  }

  const addNode = async ()=>{
    let id = await createNode("new" + Math.floor(Math.random() * 1000), currentBoardData._id);
    setEditNodeId(id);
    loadBoardData();
  }

  let attachmentManagerOpen = false;

  onMount(loadBoardList);
    
</script>

<div class="top-right">
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

{#if currentBoardData}

  {#if editMode}
    <h2>edit board</h2>
    <input bind:value={currentBoardData.name} type="text"/><br>
    <textarea bind:value={currentBoardData.description}></textarea><br>
    <label>listed</label> <input type="checkbox" bind:checked={currentBoardData.listed}/><br><br>
    <label>code library (executed every time a node runs):</label><br>
    <CodeEditor bind:code={currentBoardData.library}></CodeEditor><br>
    <button on:click={saveBoard}>save</button>
    <button on:click={loadBoardData}>cancel</button><br>
    <br>
  {:else}
    
    {#if !attachmentManagerOpen}
      <div class="edit-headline">
      <h2>{currentBoardData.name} 
        <small>{currentBoardData.listed ? "listed" : "unlisted"}</small>
        <a target="_blank" href="{playerURL}?board={currentBoardData._id}">external player link</a>
      </h2>
      
      <p>{currentBoardData.description ? currentBoardData.description : ""}</p>
      <button on:click="{()=>{editMode=true}}">✎</button>
      </div>

      <NodeGraph
        {currentBoardData}
        nodes={currentBoardData.scriptNodes}
        {editNodeId}
        {setEditNodeId}
        {playerNodeId}
        {currentBoardData}
      />
    {:else}
      <AttachmentManager
        boardId={currentBoardData._id}
        close={()=>{attachmentManagerOpen = false}}
      />
    {/if}
  {/if}
  
  <br>
  {#if !currentBoardData.new}
    {#if !attachmentManagerOpen}    
      <button id="toggle-attachment-manager" on:click={()=>{attachmentManagerOpen = true}}>📎</button>
      <button id="add-node" on:click={addNode}>add node</button>
    {/if}
  {/if}
  
{/if}


<style>
  a {
    color: gray;
    padding-left: 1px;
    margin-bottom: 10px;
    position: relative;
    font-size: 10px;
    font-weight: normal;
  }

  button, input, h2, select {
    position: relative;
    z-index: 1;
  }

  h2 {
    margin-bottom: 0;
  }

  label {
    display: inline-block;
  }

  h2 small {
    font-weight: normal;
    font-size: 10px;
    color: gray;
  }

  #add-node {
    position: absolute;
    bottom: 10px;
    right: 10px;
    margin-bottom: 0px;
  }

  #toggle-attachment-manager {
    position: absolute;
    bottom: 10px;
    left: 10px;
    margin-bottom: 0px; 
  }

  .top-right {
    position: absolute;
    top: 0px;
    right: 0px;
    background-color: #fff;
    width: 100%;
    text-align: right;
    padding-right: 10px;
    padding-top: 10px;    
    z-index: 10;
    border-bottom: 1px solid gray;
  }


</style>