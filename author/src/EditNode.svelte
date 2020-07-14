<script>
  import { onMount, onDestroy, tick, beforeUpdate } from 'svelte';
  import { joinNode } from '../../shared/socketClient.js';
  import { token } from './stores.js';
  import CodeMirror from 'codemirror';
  import 'codemirror/lib/codemirror.css';
  import 'codemirror/mode/javascript/javascript.js';

  import CodeEditor from './CodeEditor.svelte';
  import VarList from './VarList.svelte';

  import { cheatSheet } from "./cheatSheet.js";

  export let playerId;
  export let editNodeId;
  export let setEditNodeId;
  export let reloadBoardData;
  export let currentBoardData;

  export let createNode;
  
  let scriptNode = {};
  let scriptNodeEdit = {};
  let startingNodeEdit;

  let editTitle = false;
 
  const loadNoad = async (id) => {
    const res = await fetch("/api/scriptNode/" + editNodeId);
    const json = await res.json();
    //console.log(json);
    scriptNode = json;
    scriptNodeEdit = {...json};

    setStartingNodeEdit();
    
    if(typeof scriptNodeEdit.multiPlayer == "undefined") {
      scriptNodeEdit.multiPlayer = false;
    }   
  }

  const setStartingNodeEdit = ()=>{
    console.log("setStartingNodeEdit");
    if(currentBoardData)
      startingNodeEdit = currentBoardData.startingNode == scriptNodeEdit._id;
    else 
      console.log("warning: loading node without currentBoardData")
  }


  const saveAndLoad = async (nodeId)=>{
    if(changed) {
      if(scriptNodeEdit._id) {
        if(confirm("save " + scriptNodeEdit.name + "?")) {
          await save();
          loadNoad(nodeId);
        } else {
          loadNoad(nodeId);
        }
      }
    } else {
      loadNoad(nodeId);
    }
  }

  // run whenever editNodeId prop changes
  $: {    
     console.log('editNodeId changed', editNodeId);
     saveAndLoad(editNodeId);
  }

  // update starting node whenever currentBoardData changes
  $: {
    if(currentBoardData) {
      setStartingNodeEdit();
    }  
  }

  // track changes in node object
  $: changed = JSON.stringify(scriptNode) !== JSON.stringify(scriptNodeEdit);
  
  // track changes in starting node checkbox
  let startingNodeChanged = false;
  const updateStartingNodeChanged = () => {
    startingNodeChanged = startingNodeEdit != (currentBoardData.startingNode == scriptNodeEdit._id)
  }

  async function save(andRun=false) {

    if(startingNodeChanged) {
      let response;
      console.log("startingNodeEdit", startingNodeEdit);

      if(startingNodeEdit) {
        response = await fetch("/api/board/" + currentBoardData._id, {
        method: "PUT",
        headers: {
          'authorization': $token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startingNode: scriptNodeEdit._id,
          })
        });
        
      } else {
        response = await fetch("/api/board/" + currentBoardData._id + "/removeStartingNode", {
        method: "PUT",
        headers: {
          'authorization': $token,
          'Content-Type': 'application/json'
        },
        });
      }

      if(response.ok) {
        let json = await response.json();
        console.log(json);
        reloadBoardData();
      }  
    }
    
    if(changed) {
      //console.log("save", scriptNodeEdit);

      let connectedNodeNames = [];
      let array1;
      let regex1 = /(?:moveTo\(\")(.+)(?:\"\))/g    
      while ((array1 = regex1.exec(scriptNodeEdit.script)) !== null) {
        connectedNodeNames.push(array1[1]);
      } 
      let currentNodeNames = currentBoardData.scriptNodes.map((n)=>n.name);
      let newNodes = connectedNodeNames.filter((n)=>currentNodeNames.indexOf(n) == -1);
      console.log("newNodes", newNodes);

      newNodes.forEach(async (n)=>{
        await createNode(n, currentBoardData._id)
      })

      let response = await fetch("/api/scriptNode/" + scriptNodeEdit._id, {
        method: 'PUT',
        headers: {
          'authorization': $token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: scriptNodeEdit.name, 
          script: scriptNodeEdit.script,
          multiPlayer: scriptNodeEdit.multiPlayer,
          board: currentBoardData._id,
        })
      });
      if(response.ok) {
        const newNode = await response.json();
        scriptNode = {...newNode};
        scriptNodeEdit = {...newNode};
        editTitle = false;

        reloadBoardData();

        if(andRun) {
          doMoveTo(scriptNodeEdit.id)
        }
      }  
    }
    
  }

  const deleteNode = async ()=> {
    if(confirm("really?")) {
      await fetch("/api/scriptNode/" + editNodeId, {
        method: "DELETE",
        headers: {'authorization': $token},
      });
      setEditNodeId(null);
      reloadBoardData();
    }
  }

  let showHelp = false;

  const doMoveTo = async (nodeId) => {
    let res = await fetch("/api/nodeLog/logPlayerToNode/" + playerId + "/" + editNodeId, {method: "POST"});
    let resJSON = await res.json();
    //console.log(resJSON);
  }
  

</script>


<button class="help-button" on:click={()=>showHelp = !showHelp}>{showHelp ? "close" : "cheat sheet"}</button>

{#if showHelp} 
<div class="scroll help-content">
   <h2>cheat sheet</h2>
   <CodeEditor readOnly code={cheatSheet}></CodeEditor>
</div>
{/if}

<div class="scroll">

{#if !editTitle}
  <div class="edit-headline">
    <h2>{currentBoardData ? currentBoardData.key : ""}/{scriptNodeEdit.name}</h2>
    <button on:click="{()=>{editTitle=true}}">✎</button>
    <button on:click={()=>{doMoveTo(scriptNodeEdit._id)}}>move player here</button>
  </div>
{:else}
  <input bind:value={scriptNodeEdit.name}><br/>
  <button on:click="{()=>{editTitle=false}}">cancel</button>
{/if}

<CodeEditor bind:code={scriptNodeEdit.script}></CodeEditor>

<!--label>multiplayer</label> <input type="checkbox" bind:checked={scriptNodeEdit.multiPlayer}/><br/-->
<label>starting node for board</label> <input type="checkbox" bind:checked={startingNodeEdit} on:change={updateStartingNodeChanged}/><br>

{#if changed || startingNodeChanged} <button on:click={()=>save(false)}>save</button> <button on:click={()=>save(true)}>save & run</button><br>{/if}

<button on:click={deleteNode}>delete</button><br>


{#if editNodeId}
  <VarList scope="node" ids={{node: editNodeId}} authoring/>
  <VarList scope="playerNode" ids={{node: editNodeId, player: playerId}} authoring/>
{/if}

</div>


<style>
  
  label {
    display: inline-block;
  }

  .scroll {
    width: 100%;
    height: 100%;
    overflow-y: auto;
  }

  .help-button {
    position: absolute;
    right: 10px;
    top: 10px;
    z-index: 10;
  }

  .help-content {
    background-color: white;
    position: absolute;
    top: 0;
    left: 0;
    z-index: 9;
    padding: 10px;
    box-sizing: border-box;
  }
</style>



