<script>

  export let onClose;
  export let visible;
  export let item;

</script>

<div id="container" on:click={onClose} style="visibility: {visible ? 'visible' : 'hidden'}">     
  <div id="content" on:click|stopPropagation>
    <button id="close" on:click={onClose}>close</button>
    <h2>{item ? item.key : ""}</h2>
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
  padding: 40px;
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

#close {
  position: absolute;
  top: 10px;
  right: 10px;
  box-shadow: 2px 2px #ddd;
}

</style>
