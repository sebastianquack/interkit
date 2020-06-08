<script>

  import { onMount } from 'svelte';
  import marked from 'marked';

  export let onClose;
  export let projectId;

  let pages = [];
  let currentPage = null;

  onMount(async ()=>{
    let res = await fetch("/api/page?$sort=menuOrder&project=" + projectId)
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
    </div>

  {:else}

    <div class="page-container">
      <button class="close-button" on:click={()=>{currentPage=null; onClose()}}>{"close"}</button>    
      {@html marked(currentPage.content)}
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
  width: 66%; 
  bottom: 0;
  background-color: #fff;
  padding: 20px;
  box-sizing: border-box;
  z-index: 10;
  box-shadow: 2px 0px gray;
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
  width: 100%; 
  background-color: #fff;
  padding: 20px;
  box-sizing: border-box;
  z-index: 10;   
  overflow-y: scroll;
}

</style>
