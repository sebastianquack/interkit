<script>
  import { onMount, onDestroy, tick, beforeUpdate, afterUpdate } from 'svelte';

  import CodeMirror from 'codemirror';
  import 'codemirror/lib/codemirror.css';
  import 'codemirror/mode/javascript/javascript.js';

  let textArea;
  let editor;
  let editorChanged = false;
  export let code;
  export let readOnly = false;
  
  onMount(()=>{
    console.log("mount");
    editor = CodeMirror.fromTextArea(textArea, {
      lineNumbers: true,
      mode:  "javascript",
      readOnly: readOnly ? true : false,
      lineWrapping: true
    });
    editor.on("change", ()=>{editorChanged = true; code = editor.getValue()})
  })

  afterUpdate(()=>{
    if(!editorChanged) {
      editor.getDoc().setValue(code ? code : "");
    }
    editorChanged = false;
  })

  onDestroy(()=> {
    editor.toTextArea();
  })

</script>

<textarea bind:this={textArea} value={code}></textarea><br/>  
