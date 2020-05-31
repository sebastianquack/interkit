<script>

  import { onMount } from 'svelte';
  
  import { token } from './stores.js';  
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
    
  let playerURL;

  let editMode;

  $: {
    if(currentBoardId && currentBoardData && currentBoardData.expired)
     loadBoardData();
  }

  $: {
    if(currentBoardData)
      if(currentBoardData.new) 
        editMode = true;
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
    
</script>

{#if currentBoardData}

  {#if editMode}

    <div class="scroll">

    <h2>edit board</h2>
    <input bind:value={currentBoardData.name} type="text"/><br>
    <textarea bind:value={currentBoardData.description}></textarea><br>
    <label>listed</label> <input type="checkbox" bind:checked={currentBoardData.listed}/><br><br>
    <label>code library (executed every time a node runs):</label><br>
    <CodeEditor bind:code={currentBoardData.library}></CodeEditor><br>
    <button on:click={saveBoard}>save</button>
    <br>

    <VarList scope="board" ids={{board: currentBoardData._id}}/>

    <button on:click={()=>editMode = false}>close</button>

    </div>
    
  {:else}
    
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

  {/if}
  
  {#if !currentBoardData.new}
    {#if !editMode}    
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



</style>