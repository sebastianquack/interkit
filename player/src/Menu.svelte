<script>

  import { onMount } from 'svelte';
  import { getConfig } from '../../shared/util.js'
  
  export let onClose;
  export let projectId;
  export let playerId;
  export let handleHtmlClicks;

  let currentPage = null;
  let playerURL;
  let menuPages = [];

  onMount(async ()=>{
    let res = await fetch("/api/page/listWithVars?project=" + projectId + "&player=" + playerId)
    let json = await res.json();
    if(json.docs) {
      const pages = json.docs;  
      menuPages = pages
        .filter(p => p.menuOrder !== undefined && parseInt(p.menuOrder) >= 0)
        .sort((p1,p2) => parseInt(p1.order)-parseInt(p2.order))   
    }

    playerURL = await getConfig("playerURL"); 
  })

</script>

<div class="click-catch" on:click|stopPropagation={onClose}>
  
  {#if !currentPage}
  
    <div class="menu-container" on:click|stopPropagation>      
      <div class="menu-entries">
      {#each menuPages as page}
        <div class="menu-entry">
          <h3 on:click|stopPropagation={()=>currentPage=page}>{page.menuEntry}</h3>
        </div>
      {/each}
      </div>
    </div>

  {:else}

    <div class="page-container">
      <div class="page" on:click|stopPropagation={e=>handleHtmlClicks(e, "menu")}>
        {@html currentPage.contentWithVars}
      </div>
    </div>

  {/if}

</div>



<style type="text/scss">

.click-catch {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  bottom: 0;
  z-index: 11;
  //background-color: rgb(0,0,0, 0.75);
}


.close-button {
  position: absolute;
  right: 10px;
  top: 10px;
}

.menu-container, .page-container {
  position: absolute;
  left: 0;
  top: 69px;
  width: 100%; 
  bottom: 0;
  background-color:var(--color-bright);
  box-sizing: border-box;
  z-index: 10;
  overflow-y: scroll;
}

.menu-container {
    padding-top: 24px;
}

.menu-entry {
  border-bottom: 1px var(--color-dark) solid;
  padding: 24px;
  font-weight: bold;
  font-size: 18px;
  line-height: 21px;  
  letter-spacing: var(--letter-spacing-bold);
}

.menu-entries h3:hover {
  cursor: pointer;
}

.page-container {
  
  color: red;
}
:global {
  .page-container {
    .page {
    }
    .page > * {
      margin-bottom: 18px;
      padding-left: 24px;
      padding-right: 24px;
    }

    font-size: 17px;
    line-height: 24px;

    h1 {
      font-family: EurostyleLTStd-Ex2;
      font-size: 27px;
      line-height: 30px;      
      letter-spacing: 0.04em;
      text-transform: uppercase;
      padding: 32px 24px 24px 24px;
      background: url("/assets/insel_dither_farbig.png") 0% 0% repeat;
      background-position: 20%;
      text-align: center;
    }

    h2 {
      font-weight: bold;
      font-size: 18px;
      line-height: 21px;
      letter-spacing: var(--letter-spacing-bold);
    }

    p {
      margin-bottom: 1em;
    }
  }
}

</style>
