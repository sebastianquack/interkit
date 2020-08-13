<script>

  import { onMount } from 'svelte';

  //export let visible;
  //export let items = [];
  //export let setItemModal;
  export let projectId;
  export let playerId;
  export let handleHtmlClicks;
  
  let icons = {
    "location": "marker.png",
    "document": "doc_icon.png"
  }

  let page;

  onMount(async ()=>{
    let res = await fetch("/api/page/listWithVars?project=" + projectId + "&player=" + playerId + "&key=archive")
    let pages = await res.json();
    page = pages.docs[0]
    //console.log(page)
  })
    
</script>

<!--div id="container" style="visibility: {visible ? 'visible' : 'hidden'}">     
    {#each items as item}
      <div class="item" on:click={()=>setItemModal(item)}>
        <img src={icons[item.type]} alt="item icon"/>
        <span>{item.key}</span>
      </div>
    {/each}
</div-->

<div id="container" class="archive-page" on:click|stopPropagation={(e)=>handleHtmlClicks(e, "archive")}>{#if page}{@html page.contentWithVars}{/if}</div>


<style type="text/scss">

  #container {
    width: 100%; 
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
    background-color: #f8f3e3;
    box-sizing: border-box;
    padding-top: 75px;
  }

  :global .archive-page {

    image-rendering: pixelated;

    .headline,
    .boat-name {
      text-transform: uppercase;
      font-size: 18px;
      line-height: 22px;    
    }

    .headline {
      font-weight: bold;
      letter-spacing: var(--letter-spacing-bold);
    }

    > * {
      margin-bottom: 24px;
    }

    .boat {
      padding: 24px;
      height: 50vh;
      min-height: 300px;
      width: 100%;
      box-sizing: border-box;
      background-repeat: no-repeat;
      background-position: 50% 90%;
      background-size: cover;
      position: relative;

      .island {
        position: absolute;
        bottom: 24px;
      }

      .boat-modal {
        position: absolute;
        bottom: 24px;
        right: 24px;
      }

    }

    /*.goods*/ ul {
      display: flex;
      flex-direction: row;
      flex-wrap: wrap;
      li {
        background-repeat: no-repeat;
        width: 64px;
        height: 64px;
        button {
          width: 100%; height: 100%;
          padding: 0; margin: 0;
          background: transparent;
          border-radius: 0;
          cursor: pointer;
        }
      }
    }

  }

</style>
