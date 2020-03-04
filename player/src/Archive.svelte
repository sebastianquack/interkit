<script>

  export let onClose;
  export let visible;
  export let items = [];
  export let setItemModal;

</script>

<div id="container" style="visibility: {visible ? 'visible' : 'hidden'}">     
  <ul>
    {#each items as item}
      <li on:click={()=>setItemModal(item)}>{item.key} ({item.type})</li>
    {/each}
  </ul>
</div>

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

#close {
  position: absolute;
  top: 10px;
  right: 10px;
  box-shadow: 2px 2px #ddd;
}

li:hover {
  cursor: pointer;
}

</style>
