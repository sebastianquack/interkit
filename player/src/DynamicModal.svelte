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

<div id="container" on:click={onClose}>     
  <div id="content" on:click|stopPropagation={debounce(e=>{handleHtmlClicks(e, "modal")}, 5000, true)}>
    <button id="close" on:click={onClose}>close</button>
      {#if page}
        {@html page.contentWithVars}
      {/if}
  </div>
</div>

<style>

#container {
  width: 100%; 
  height: 100%;
  position: absolute;
  left: 0;
  top: 0;
  background-color: rgb(0,0,0,0.75);
  padding: 10px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  z-index: 11;
}

#content {
  background-color: #fff;
  width: 100%;
  max-height: 100%;
  position: relative;
  padding: 20px;
  box-sizing: border-box;
  flex-grow: 0.5;
  flex-direction: column;
}


#close {
  position: absolute;
  top: 10px;
  right: 10px;
  box-shadow: 2px 2px #ddd;
}

</style>
