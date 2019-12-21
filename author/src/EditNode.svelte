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
    
  let textArea1;
  let textArea2;
  let editor1;
  let editor2;

  let editTitle = false;
   
  const loadNoad = async (id) => {
    const res = await fetch("/api/scriptNode/" + editNodeId);
    const json = await res.json();
    console.log(json);
    scriptNode = json;
    scriptNodeEdit = {...json};   

    if(editor1) editor1.toTextArea();
    if(editor2) editor2.toTextArea();
    
    await tick();
    
    editor1 = CodeMirror.fromTextArea(textArea1, {
      lineNumbers: true,
      mode:  "javascript"
    });
    editor1.on("change", ()=>{scriptNodeEdit.initScript = editor1.getValue()})

    editor2 = CodeMirror.fromTextArea(textArea2, {
      lineNumbers: true,
      mode:  "javascript"
    });  
    editor2.on("change", ()=>{
      scriptNodeEdit.responseScript = editor2.getValue()
    })    
  }

  // run whenever editNodeId prop changes
  $: {
     console.log('editNodeId changed', editNodeId);
     loadNoad(editNodeId);
  }

  async function save() {
    console.log("save");
    const response = await fetch("/api/scriptNode/" + scriptNodeEdit._id, {
      method: 'PUT',
      headers: {'authorization': $token},
      body: JSON.stringify({
        name: scriptNodeEdit.name, 
        initScript: editor1.getValue(),
        responseScript: editor2.getValue(),
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
    editor1.toTextArea();
    editor2.toTextArea();
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
<textarea bind:this={textArea1} bind:value={scriptNodeEdit.initScript}></textarea><br/>
<textarea bind:this={textArea2} bind:value={scriptNodeEdit.responseScript}></textarea><br/>

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
</style>



