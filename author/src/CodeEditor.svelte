<script>
  import { onMount, onDestroy, tick, beforeUpdate } from 'svelte';

  import CodeMirror from 'codemirror';
  import 'codemirror/lib/codemirror.css';
  import 'codemirror/mode/javascript/javascript.js';

  let textArea;
  let editor;
  export let code;
  
  onMount(()=>{
    editor = CodeMirror.fromTextArea(textArea, {
      lineNumbers: true,
      mode:  "javascript"
    });
    editor.on("change", ()=>{code = editor.getValue()})
  })

  onDestroy(()=> {
    editor.toTextArea();
  })

</script>

<textarea bind:this={textArea} bind:value={code}></textarea><br/>  