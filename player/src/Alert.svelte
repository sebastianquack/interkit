<script>

  export let close;
  export let alertOptions;
  
</script>

<div class="container" on:click|stopPropagation={close}>     
  <div class="content" on:click|stopPropagation>
    <p>{alertOptions.alertMessage}</p>
    <button on:click={close}>OK</button>
  </div>
</div>

<style>

.container {
  height: 100%;
  width: 100%;
  position: absolute;
  left: 0;
  top: 0;
  background-color: rgb(0,0,0,0.75);
  padding: 10px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
  z-index: 11;
}

.content {
  background-color: #fff;
  width: 70%; 
  margin: auto;
  position: relative;
  padding: 20px;
  box-sizing: border-box;
  flex-direction: column;
  justify-content: center;
  display: flex;
}

.content p {
  text-align: center;
}

</style>
