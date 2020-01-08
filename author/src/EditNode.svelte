<script>
  import { onMount, onDestroy, tick, beforeUpdate } from 'svelte';
  import { token } from './stores.js';
  import CodeMirror from 'codemirror';
  import 'codemirror/lib/codemirror.css';
  import 'codemirror/mode/javascript/javascript.js';

  import { getConfig } from '../../shared/util.js';

  export let editNodeId;
  export let setEditNodeId;
  export let setPlayerNodeId;
  export let reloadBoardData;
  
  let scriptNode = {};
  let scriptNodeEdit = {};
    
  let textArea;
  let editor;
  
  let editTitle = false;
   
  const loadNoad = async (id) => {
    const res = await fetch("/api/scriptNode/" + editNodeId);
    const json = await res.json();
    //console.log(json);
    scriptNode = json;
    scriptNodeEdit = {...json};

    if(typeof scriptNodeEdit.multiPlayer) {
      scriptNodeEdit.multiPlayer = false;
    }   

    if(editor) editor.toTextArea();
    
    await tick();
    
    editor = CodeMirror.fromTextArea(textArea, {
      lineNumbers: true,
      mode:  "javascript"
    });
    editor.on("change", ()=>{scriptNodeEdit.script = editor.getValue()})

  }

  // run whenever editNodeId prop changes
  $: {
     //console.log('editNodeId changed', editNodeId);
     loadNoad(editNodeId);
  }

  async function save() {
    //console.log("save", scriptNodeEdit);
    const response = await fetch("/api/scriptNode/" + scriptNodeEdit._id, {
      method: 'PUT',
      headers: {'authorization': $token},
      body: JSON.stringify({
        name: scriptNodeEdit.name, 
        script: editor.getValue(),
        multiPlayer: scriptNodeEdit.multiPlayer
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

  $: changed = JSON.stringify(scriptNode) !== JSON.stringify(scriptNodeEdit);
  
  onDestroy(()=> {
    editor.toTextArea();
  })

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

  let playerURL;

  onMount(async ()=>{
    playerURL = await getConfig("playerURL");
  }) 

</script>

{#if !editTitle}
  <div class="edit-headline">
    <h2>{scriptNodeEdit.name}</h2>
    <button on:click="{()=>{editTitle=true}}">edit</button>
  </div>
{:else}
  <input bind:value={scriptNodeEdit.name}><br/>
{/if}
<textarea bind:this={textArea} bind:value={scriptNodeEdit.script}></textarea><br/>
<label>multiplayer</label> <input type="checkbox" bind:checked={scriptNodeEdit.multiPlayer}/><br/>

{#if changed} <button on:click={save}>save</button> {/if}


<br/>
<button on:click={()=>{setPlayerNodeId(scriptNodeEdit._id)}}>play node</button>
<button on:click={deleteNode}>delete node</button><br>
<a target="_blank" href="{playerURL}?node={scriptNodeEdit._id}">external player link</a>

<style>
  a {
    font-size: 80%;
    color: gray;
    padding-left: 1px;
  }

  label {
    display: inline-block;
  }
</style>



