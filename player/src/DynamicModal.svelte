<script>

  export let onClose;
  export let dynamicModalPage;
  export let dynamicModalParameter;
  export let handleHtmlClicks;
  export let projectId;
  export let playerId;

  import { onMount } from 'svelte';

  const debounce = require('debounce');

  let ready = true

  const buttonPress = (button) => {
    if(ready) {
      ready = false;
      handleButton(button, item);
      setTimeout(()=>{ready = true}, 200)
    }
  }

  let page;

  onMount(async ()=>{
    let res = await fetch("/api/page/listWithVars?project=" + projectId + "&player=" + playerId + "&key=" + dynamicModalPage + "&parameter=" + dynamicModalParameter)
    let json = await res.json();
    if(json.docs) page = json.docs[0];  
  })

</script>

<div id="modal-container" on:click={onClose}>     
  <div class="modal-content" on:click|stopPropagation={debounce(e=>{handleHtmlClicks(e, "modal")}, 5000, true)}>
    <button id="modal-close" on:click={onClose}>close</button>
      {#if page}
        {@html page.contentWithVars}
      {/if}
  </div>
</div>

<style>
  /* note: global style is used, defined in Modal.svelte */
</style>
