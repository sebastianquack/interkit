<script>
  import { onMount, onDestroy } from 'svelte';
  import { token } from './stores.js';
  import CodeMirror from 'codemirror';
  import 'codemirror/lib/codemirror.css';

  export let scriptNode;
  export let update;
  
  let scriptNodeEdit = {...scriptNode};

  let editorTextArea1;
  let editorTextArea2;
  let editor1;
  let editor2;
  
  onMount(() => {
    editor1 = CodeMirror.fromTextArea(editorTextArea1, {
      lineNumbers: true
    });
    editor1.on("change", ()=>{scriptNodeEdit.initScript = editor1.getValue()})

    editor2 = CodeMirror.fromTextArea(editorTextArea2, {
      lineNumbers: true
    });  
    editor2.on("change", ()=>{scriptNodeEdit.responseScript = editor2.getValue()})
  });

  $: changed = JSON.stringify(scriptNode) !== JSON.stringify(scriptNodeEdit);
  
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
      scriptNodeEdit = {...newNode};
      update(newNode);
    }
  }

  onDestroy(()=> {
    editor1.toTextArea();
    editor2.toTextArea();
  })


</script>


<h2>edit script node</h2>
<input bind:value={scriptNodeEdit.name}><br/>
<textarea bind:this={editorTextArea1} bind:value={scriptNodeEdit.initScript}></textarea><br/>
<textarea bind:this={editorTextArea2} bind:value={scriptNodeEdit.responseScript}></textarea><br/>

{#if changed} <button on:click={save}>save</button> {/if}
