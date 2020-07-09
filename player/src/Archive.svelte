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

<div id="container" on:click|stopPropagation={(e)=>handleHtmlClicks(e, "archive")}>{#if page}{@html page.contentWithVars}{/if}</div>


<style>

#container {
  width: 100%; 
  height: 100%;
  position: absolute;
  left: 0;
  top: 0;
  background-color: #f8f3e3;
  padding: 20px;
  box-sizing: border-box;
  padding-top: 45px;
}

/*
div.item {
  float: left;
  width: 100px;
  display: flex;
  flex-direction: column;
}

div.item img {
  height: 50px;
  display: block;
  margin-left: auto;
  margin-right: auto;
}

div.item span {
  width: 100%;
  text-align: center;
  display: inline-block;
}

div.item:hover {
  cursor: pointer;
}
*/

</style>
