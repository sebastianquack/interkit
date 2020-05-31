<script>
  import { onMount, onDestroy, tick, beforeUpdate } from 'svelte';
  import { token } from './stores.js';
  import CodeMirror from 'codemirror';
  import 'codemirror/lib/codemirror.css';
  import 'codemirror/mode/javascript/javascript.js';

  import CodeEditor from './CodeEditor.svelte';
  import VarList from './VarList.svelte';

  import { cheatSheet } from "./cheatSheet.js";

  export let editNodeId;
  export let setEditNodeId;
  export let setPlayerNodeId;
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

    startingNodeEdit = currentBoardData.startingNode == scriptNodeEdit._id;

    if(typeof scriptNodeEdit.multiPlayer == "undefined") {
      scriptNodeEdit.multiPlayer = false;
    }   
  }

  const saveAndLoad = async (nodeId)=>{
    if(changed) {
      if(confirm("save " + scriptNodeEdit.name + "?")) {
        await save();
        loadNoad(nodeId);
      } else {
        loadNoad(nodeId);
      }
    } else {
      loadNoad(nodeId);
    }
  }

  // run whenever editNodeId prop changes
  $: {    
     //console.log('editNodeId changed', editNodeId);
     saveAndLoad(editNodeId);
  }

  $: changed = JSON.stringify(scriptNode) !== JSON.stringify(scriptNodeEdit);
  $: startingNodeChanged = startingNodeEdit != (currentBoardData.startingNode == scriptNodeEdit._id);
  
  async function save() {

    if(startingNodeChanged) {
      let response;
      console.log("startingNodeEdit", startingNodeEdit);

      if(startingNodeEdit) {
        response = await fetch("/api/board/" + currentBoardData._id, {
        method: "PUT",
        headers: {'authorization': $token},
        body: JSON.stringify({
          startingNode: scriptNodeEdit._id,
          })
        });
        
      } else {
        response = await fetch("/api/board/" + currentBoardData._id + "/removeStartingNode", {
        method: "PUT",
        headers: {'authorization': $token}
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
        headers: {'authorization': $token},
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
    <h2>{scriptNodeEdit.name}</h2>
    <button on:click="{()=>{editTitle=true}}">✎</button>
    <button on:click={()=>{setPlayerNodeId(scriptNodeEdit._id)}}>play</button>
  </div>
{:else}
  <input bind:value={scriptNodeEdit.name}><br/>
  <button on:click="{()=>{editTitle=false}}">cancel</button>
{/if}

<CodeEditor bind:code={scriptNodeEdit.script}></CodeEditor>

<label>multiplayer</label> <input type="checkbox" bind:checked={scriptNodeEdit.multiPlayer}/><br/>
<label>starting node for board</label> <input type="checkbox" bind:checked={startingNodeEdit}/><br>

{#if changed || startingNodeChanged} <button on:click={save}>save</button><br>{/if}

<button on:click={deleteNode}>delete</button><br>


{#if scriptNodeEdit._id}
  <VarList scope="node" ids={{node: scriptNodeEdit._id}}/>
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



