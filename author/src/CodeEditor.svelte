<script>
  import { onMount, onDestroy, tick, beforeUpdate, afterUpdate, createEventDispatcher } from 'svelte';

  import CodeMirror from 'codemirror';
  import 'codemirror/lib/codemirror.css';
  import 'codemirror/mode/javascript/javascript.js';
  import 'codemirror/mode/markdown/markdown.js';
  import 'codemirror/mode/handlebars/handlebars.js';

  const dispatch = createEventDispatcher();

  let textArea;
  let editor;
  let editorChanged = false;
  export let code = "";
  export let readOnly = false;
  export let language = "javascript";

  onMount(()=>{
    //console.log("mount");
    console.log(language);
    editor = CodeMirror.fromTextArea(textArea, {
      lineNumbers: true,
      mode: language,
      readOnly: readOnly ? true : false,
      lineWrapping: true
    });
    editor.on("change", ()=>{editorChanged = true; code = editor.getValue(); dispatch('change', {code})})
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

<textarea bind:this={textArea} value={code}></textarea>  
