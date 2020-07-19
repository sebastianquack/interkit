<script>

  import { onMount } from 'svelte';
  
  import { token, boardCodeChanged } from './stores.js';  
  import CodeEditor from './CodeEditor.svelte';
  import NodeGraph from './NodeGraph.svelte';
  import VarList from './VarList.svelte';
  
  export let currentBoardId;
  export let setCurrentBoardId;

  export let currentBoardData;
  export let setCurrentBoardData;

  export let setEditNodeId;  
  export let editNodeId;

  export let playerNodeId;
  export let projectId;
  
  export let loadBoardData;
  export let loadBoardList;

  export let createNode;
  export let deleteBoard;

  let editMode;

  $: {
    if(currentBoardData)
      if(currentBoardData.new) 
        openEditMode();     
  }

  $: {
    if(currentBoardId && currentBoardData && editMode) 
      openEditMode();
  }


  let initialBoardLibrary = null;
  let changed = false;
  
  const openEditMode = () => {
    console.log("openEditMode")
    editMode = true;
    initialBoardLibrary = currentBoardData.library
  }

  const closeEdit = () => {
    if(changed) {
      if(confirm("lose changes?")) {
        editMode = false;
        changed = false;
        boardCodeChanged.set(false);
      }
    } else {
      editMode = false; 
      if(currentBoardData.new) setCurrentBoardData(null);    
    }
  }

  const changeBoardLibrary = () => {
    console.log("board library changed through editor")
    if(initialBoardLibrary != null) {
      changed = initialBoardLibrary != currentBoardData.library;
      boardCodeChanged.set(changed)
    }
  }

  const saveBoard = async ()=>{
    let response;
    
    if(currentBoardData.new) {
      response = await fetch("/api/board", {
        method: "POST",
        headers: {
          'authorization': $token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([{
          key: currentBoardData.key,
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
        headers: {
          'authorization': $token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          _id: currentBoardData._id,
          key: currentBoardData.key,
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
        //editMode = false;
        changed = false;
      }
    }

    await loadBoardList();
    setCurrentBoardId(currentBoardData._id);
    boardCodeChanged.set(false)
  }

  const addNode = async ()=>{
    let id = await createNode("new" + Math.floor(Math.random() * 1000), currentBoardData._id);
    setEditNodeId(id);
    loadBoardData();
  }
    
</script>

{#if currentBoardData}

  {#if editMode}

  <div class="floating-buttons">
    {#if changed}
      <button on:click={saveBoard}>save</button>
    {/if}
    <button on:click={closeEdit}>close</button>
  </div>

    <div class="scroll">

    <h2>edit board </h2>
    <label>key</label>
    <input bind:value={currentBoardData.key} type="text"/><br>
    <label>display name</label>
    <input bind:value={currentBoardData.name} type="text"/><br>
    <textarea bind:value={currentBoardData.description}></textarea><br>
    <label>listed</label> <input type="checkbox" bind:checked={currentBoardData.listed}/><br><br>
    <label>code library (executed every time a node runs):</label><br>
    <CodeEditor bind:code={currentBoardData.library} on:change={changeBoardLibrary}></CodeEditor><br>
    <br>

    {#if !currentBoardData.new}
      <VarList authoring scope="board" ids={{board: currentBoardData._id}}/>
    {/if}

    {#if currentBoardData && !currentBoardData.new}
      <button on:click={deleteBoard}>delete board</button> 
    {/if}

    

    </div>

    

    
  {:else}
    
      <div class="edit-headline">
        <h2>{currentBoardData.name} 
          <small>key: {currentBoardData.key}, default: {currentBoardData.listed ? "listed" : "unlisted"}</small>
        </h2>
        
        <p>{currentBoardData.description ? currentBoardData.description : ""}</p>
        <button on:click={openEditMode}>✎</button>
      </div>

      <NodeGraph
        {currentBoardData}
        nodes={currentBoardData.scriptNodes}
        {editNodeId}
        {setEditNodeId}
        {playerNodeId}
        {currentBoardData}
      />

  {/if}
  
  {#if !currentBoardData.new}
    {#if !editMode}    
      <button id="add-node" on:click={addNode}>add node</button>
    {/if}
  {/if}
  
{/if}



<style>
  
  button, input, h2 {
    position: relative;
    z-index: 1;
  }

  .edit-headline h2 {
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

  .scroll {
    width: 100%;
    height: 100%;
    overflow-y: auto;
  }

  .floating-buttons {
    position: absolute;
    top: 20px;
    right: 20px;
    z-index: 10;
  }



</style>