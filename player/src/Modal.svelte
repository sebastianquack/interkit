<script>

  import {joinRoom} from '../../shared/socketClient.js';

  export let onClose;
  export let visible;
  export let item;
  export let fileServerURL;
  export let projectId;

  const handleButton = async (button) => {

    let parts = button.node.split("/"); // button.node is in format "boardName/nodeName"
    if(!parts.length == 2) {
      console.log("handleButton called with bad format", boardAndNode);
      return;
    }

    let boardRes = await fetch("/api/board?name=" + parts[0] + "&project=" + projectId);
    let boardJSON = await boardRes.json();

    if(boardJSON.docs.length != 1) return;

    let nodeRes = await fetch("/api/scriptNode?name=" + parts[1] + "&board=" + boardJSON.docs[0]._id)
    let nodeJSON = await nodeRes.json();

    if(nodeJSON.docs.length != 1) return;

    console.log("node found", nodeJSON);
    
    joinRoom(nodeJSON.docs[0]._id, true, true, {item, button});
  }

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
      {#if item.value.buttons}
        {#each item.value.buttons as button}
          <button on:click={()=>{handleButton(button)}}>{button.label}</button>
        {/each}
      {/if} 
    {/if}
  </div>
</div>

<style>

#container {
  width: 100%; 
  height: 100%;
  position: absolute;
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
  max-height: 100%;
  position: relative;
  padding: 20px;
  box-sizing: border-box;
  flex-grow: 0.5;
  flex-direction: column;
}

#content img {
  width: 100%;
  max-height: 60%;
  object-fit: contain;
}

#close {
  position: absolute;
  top: 10px;
  right: 10px;
  box-shadow: 2px 2px #ddd;
}

</style>
