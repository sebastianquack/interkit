<script>

  export let onClose;
  export let visible;
  export let items = [];
  export let setItemModal;
  
  let icons = {
    "location": "marker.png",
    "document": "doc_icon.png"
  }
</script>

<div id="container" style="visibility: {visible ? 'visible' : 'hidden'}">     
    {#each items as item}
      <div class="item" on:click={()=>setItemModal(item)}>
        <img src={icons[item.type]} alt="item icon"/>
        <span>{item.key}</span>
      </div>
    {/each}
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


</style>
