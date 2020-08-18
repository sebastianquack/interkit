<script>

  import {joinNode} from '../../shared/socketClient.js';
  import {getFilenameForFilekey} from '../../shared/util.js';

  import {onMount} from 'svelte'

  export let onClose;
  export let visible;
  export let item;
  export let fileServerURL;
  //export let projectId;
  //export let playerId;
  export let handleButton;

  let ready = true

  const buttonPress = (button) => {
    if(ready) {
      ready = false;
      handleButton(button, item);
      setTimeout(()=>{ready = true}, 200)
    }
  }

  onMount(async()=>{
    item.value.audioSrc = await getFilenameForFilekey(item.value.sound)
    console.log(item.value.audioSrc)
  })

  const debounce = require('debounce');


</script>

<div id="modal-container" on:click={onClose} style="visibility: {visible ? 'visible' : 'hidden'}">     
  <div class="modal-content" on:click|stopPropagation>
    <button id="modal-close" on:click={onClose}>close</button>
    {#if item}
      {#if item.value.image}
        <img src={fileServerURL + item.value.image} alt="image of {item.key}"/>
      {/if}
      {#if item.value.imageAsset}
        <img src={"/assets/" + item.value.imageAsset} alt="image of {item.key}"/>
      {/if}
      <h2>{item.value.name}</h2>
      <p>{item.value.description ? item.value.description : ""}</p>
      {#if item.value.audioSrc} 
        <audio controls>
          <source src={fileServerURL + item.value.audioSrc} type="audio/mp3">
        </audio>
      {/if}
      {#if item.value.buttons}
        <br><br>
        {#each item.value.buttons as button}
          <button on:click={debounce(()=>{buttonPress(button)}, 5000, true)}>{button.label}</button>
        {/each}
      {/if} 
    {/if}
  </div>
</div>

<style type="text/scss">

:global {
  #modal-container {

    width: 100%; 
    height: 100%;
    position: absolute;
    left: 0;
    top: 0;
    background-color: var(--color-dark-shade);
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    z-index: 11;

    .modal-content {
      background-color: var(--color-bright);
      width: calc(100% - 2 * 24px);
      margin: 24px;
      max-height: calc(100vh - 4 * 24px);
      position: relative;
      box-sizing: border-box;
      flex-direction: column;
      border-radius: 12px;
      border: 1px var(--color-dark) solid;
     img {
        &:first-of-type {
          border-radius: 12px 12px 0 0;
          width: 100%;
          height: 40vh;
          object-fit: contain;
          background: transparent url(/assets/insel_dither_farbig.png);
          padding: 24px;
          box-sizing: border-box;   
          margin-bottom: 12px;   
        }

        & + * {
          margin-top: 24px;
        }
      }

      h2, h3, p {
        display: block;
        margin-left:24px;
        margin-right:24px;
        margin-bottom:24px;
      }

      small {
        background-color: var(--color-blue);
        display: inline-block;
        margin-right: 12px;
        border: 1px var(--color-dark) solid;
        padding: 4px;
      }

      p:empty {
        display: nonde;
      }

      button:not(#modal-close) {
        display: block;
        width: calc(100% - 2 * 24px);
        margin: 24px;
        font-weight: bold;
        letter-spacing: var(--letter-spacing-bold);
        text-transform: uppercase;
      }
    }

    #modal-close {
      position: absolute;
      top: 24px;
      right: 24px;
      width: 32px;
      height: 32px;
      color: transparent;
      overflow: hidden;
      display: block;
      border-radius: 50%;
      border: none;
      background: transparent url("/assets/icons/Close_Round_32px.svg") no-repeat 50%;
    }

  }

}

</style>
