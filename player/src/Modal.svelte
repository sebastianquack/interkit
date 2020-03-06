<script>

  export let onClose;
  export let visible;
  export let item;
  export let fileServerURL;

</script>

<div id="container" on:click={onClose} style="visibility: {visible ? 'visible' : 'hidden'}">     
  <div id="content" on:click|stopPropagation>
    <button id="close" on:click={onClose}>close</button>
    {#if item}
      <h2>{item.key}</h2>
      <p>{item.value.description ? item.value.description : ""}</p>
      {#if item.value.image}
        <img src={fileServerURL + item.value.image} alt="image of {item.key}"/>
      {/if}
      {#if item.value.sound} 
        <audio controls>
          <source src={fileServerURL + item.value.sound} type="audio/mpeg">
        </audio> 
      {/if}
    {/if}
  </div>
</div>

<style>

#container {
  width: 100%; 
  height: 100%;
  position: fixed;
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
  position: relative;
  padding: 20px;
  box-sizing: border-box;
  flex-grow: 0.5;
}

#content img {
  width: 100%;
}

#close {
  position: absolute;
  top: 10px;
  right: 10px;
  box-shadow: 2px 2px #ddd;
}

</style>
