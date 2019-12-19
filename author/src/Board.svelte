<script>

  import { onMount } from 'svelte';
  import { token } from './stores.js';  

  import NodeGraph from './NodeGraph.svelte';
  
  export let currentBoardId;
  export let setCurrentBoardId;

  export let currentBoardData;
  export let setCurrentBoardData;

  export let setCurrentNodeId;  
  
  let boards = [];
  let editMode = false;

  const loadBoardList = async ()=>{
    const res = await fetch("/api/board");
    const json = await res.json();
    boards = json.docs;
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

  $: {
    if(currentBoardId && currentBoardData && currentBoardData.expired)
     loadBoardData();
  }

  const closeBoard = ()=>{
    setCurrentBoardData(null);  
    setCurrentNodeId(null);
    editMode = false;
  }

  const createBoard = ()=>{
    let newBoard = {
      new: true,
      name: "",
      scriptNodes: []
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
          name: currentBoardData.name 
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
          name: currentBoardData.name 
        })
      });
      if(response.ok) {
        let json = await response.json();
        console.log(json);
        setCurrentBoardData(json);
        editMode = false;
      }
    }

    await loadBoardList();
    setCurrentBoardId(currentBoardData._id);
  }

  const addNode = async ()=>{

    let newNode = {
      name: "new" + Math.floor(Math.random() * 1000),
      board: currentBoardData._id,
      initScript: "",
      responseScript: "",
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
        setCurrentNodeId(json._id);
        loadBoardData();
      }
  }
  onMount(loadBoardList);
    
</script>

<select bind:value={currentBoardId} on:change={loadBoardData}>
  <option value={null}>select a board</option>
  <option disabled>_________</option>
{#each boards as board}
  <option value={board._id}>{board.name}</option>
{/each}
</select>
<button on:click={createBoard}>new board</button>

{#if currentBoardData}

  {#if !currentBoardData.new}
    <button on:click={deleteBoard}>delete board</button> 
  {/if}

  {#if editMode}
    <h2>edit board</h2>
    <input bind:value={currentBoardData.name} type="text"/>
    <button on:click={saveBoard}>save</button>
    <button on:click={loadBoardData}>cancel</button><br>
    <br>
  {:else}
    <div class="edit-headline">
      <h2>{currentBoardData.name}</h2>
      <button on:click="{()=>{editMode=true}}">edit</button>
    </div>
  {/if}

  <NodeGraph
    nodes={currentBoardData.scriptNodes}
    {setCurrentNodeId}
  />
  
  <br>
  {#if !currentBoardData.new}
    <button id="add-node" on:click={addNode}>add script node</button>    
  {/if}
  
{/if}


<style>

  button, input, h2, select {
    position: relative;
    z-index: 1
  }

  #add-node {
    position: absolute;
    bottom: 10px;
    right: 10px;
    margin-bottom: 0px;
  }


</style>