<script>

  import { onMount } from 'svelte';
  import marked from 'marked';

  export let onClose;
  export let projectId;
  export let playerId;
  export let resetPlayerContainer;

  let pages = [];
  let currentPage = null;

  onMount(async ()=>{
    let res = await fetch("/api/page/listWithVars?project=" + projectId + "&player=" + playerId)
    let json = await res.json();
    if(json.docs) pages = json.docs;
  })
  
</script>

<div class="click-catch" on:click|stopPropagation={onClose}>
  
  {#if !currentPage}
  
    <div class="menu-container" on:click|stopPropagation>     
      <button class="close-button" on:click={()=>{onClose()}}>{"close"}</button>    
      <div class="menu-entries">
      {#each pages as page}
        <h3 on:click|stopPropagation={()=>currentPage=page}>{page.menuEntry}</h3>
      {/each}
      </div>
      <button on:click={()=>{if(confirm("really?")) resetPlayerContainer()}}>reset player</button>
    </div>

  {:else}

    <div class="page-container">
      <button class="close-button" on:click={()=>{currentPage=null; onClose()}}>{"close"}</button>    
      {@html marked(currentPage.contentWithVars)}
    </div>

  {/if}

</div>



<style>

.click-catch {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  bottom: 0;
  z-index: 11;
  background-color: rgb(0,0,0, 0.75);
}


.close-button {
  position: absolute;
  right: 10px;
  top: 10px;
  box-shadow: 2px 2px #ddd;
}

.menu-container {
  position: absolute;
  left: 0;
  top: 0;
  width: 85%; 
  bottom: 0;
  background-color: #fff;
  padding: 20px;
  box-sizing: border-box;
  z-index: 10;
}

.menu-entries {
  padding-top: 1em;
  font-weight: normal;

}

.menu-entries h3:hover {
  cursor: pointer;
}

.page-container {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 85%; 
  background-color: #fff;
  padding: 20px;
  box-sizing: border-box;
  z-index: 10;   
  overflow-y: scroll;
}

</style>
