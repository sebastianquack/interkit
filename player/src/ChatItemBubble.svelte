<script>

  const QRCode = require('easyqrcodejs');

  import { onMount, afterUpdate } from 'svelte';
  
  import ChatAudioPlayer from './ChatAudioPlayer.svelte'

  export let item = {};
  export let onClick;

  export let registerAudioPlayer;
  export let onAudioEnded;

  let qrCode = null

  afterUpdate(()=>{
    //console.log("afterUpdate", item)

    // init qr code if needed
    if(item.attachment)
    if(item.attachment.mediatype == "qr") {
      console.log("setting up qr code with data: ", item.attachment.data)
      let qrOptions = {
        text: item.attachment.data,
        width: 150,
        height: 150,
      };
      let qrElem = document.getElementById("qr-" + item._id)
      //console.log("qrElem", qrElem)
      if(qrElem) {
        if(!qrCode)
          qrCode = new QRCode(qrElem, qrOptions);
      }
    }
  })
  
    
  

</script>

{#if item.params && item.attachment}

  {#if !item.params.optionsArray}

    <article class={item.params.option ? "option" : item.side} on:click={onClick}>
        {#if item.side == "left" && !item.params.option}<label class="bubble-supertitle">{item.label}</label>{/if}
        <span>
          {item.placeholder ? "..." : (item.message ? item.message : "")}
          {#if item.attachment.imgSrc && item.attachment.imgLink} 
            <a href={item.attachment.imgLink} target="_blank"><img alt={item.attachment.alt} src={item.attachment.imgSrc}/></a>
          {/if}
          {#if item.attachment.imgSrc && !item.attachment.imgLink} 
            <img alt={item.attachment.alt} src={item.attachment.imgSrc}/>
          {/if}
          {#if item.attachment.imageAsset && !item.attachment.imgLink} 
            <img alt={item.attachment.alt} src={"/assets" + item.attachment.imageAsset}/>
          {/if}
          {#if item.attachment.audioSrc} 
            <ChatAudioPlayer
              item = {item}
              registerAudioPlayer = {registerAudioPlayer}
              onAudioEnded = {onAudioEnded}
            />
          {/if}
          {#if item.attachment.mediatype == "qr"}
            <div class="qr-code" id={"qr-" + item._id}></div>
          {/if}
        </span>        
    </article>

  {:else}

    <article class="optionsArray">

      {#if item.params.prompt }
        <h5>{ item.params.prompt }</h5>
      {/if}

      {#each item.params.optionsArray as option, index}

          {#if typeof option == "object"}
            <span 
              on:click={ () => { if(item.params.index == undefined) onClick(index) } } 
              class={ index == item.params.index ? "selected" : (item.params.index != undefined ? "inactive" : "") }
              >
              {option.option}
            </span>
          {:else}
            <span 
              on:click={ () => { if(item.params.index == undefined) onClick(index) } } 
              class={ index == item.params.index ? "selected" : (item.params.index != undefined ? "inactive" : "") }
              >
              {option}
            </span>
          {/if}

      {/each}

    </article>

  {/if}

{/if}



<style type="text/scss">

article {
  margin-bottom: 12px;
  clear: both;
}

.right {
  text-align: right;
  span {
    text-align: left;
  }
}

.system {
  text-align: center;
  margin-left: 15%;
  margin-right: 15%;
  //word-break: break-all;
  hyphens: auto;
}

.system span {
  font-weight: bold;
  font-size: 12px;
  line-height: 15px;  
  text-transform: uppercase;
  letter-spacing: --letter-spacing-bold;  
}

label {
  display: block;
  font-size: 10px;
  color: gray;
  margin-bottom: 10px;
  padding-left: 11px;
  margin-top: 2px;
  text-transform: capitalize;
  color: var(--color-orange);
}

article:not(.system) span {
  padding: 0.75em 1em;
  display: inline-block;
  user-select: none;
  max-width: 75%;
  word-wrap: break-word;
  box-sizing: border-box;
  font-size: 16px;
  line-height: 24px;  
  /*white-space: pre-line; */
  border: 1px solid var(--color-dark);
  background-color: var(--color-bright);
}

span img {
  width: 100px;
  padding-top: 5px;
}

.left span {
  background-color: #eee;
  border-radius: var(--bubble-border-radius);
}

.right span {
  border-radius: var(--bubble-border-radius);
  word-break: break-all;
}

// option
.option {
  text-align: right;
  width: 100%;
  overflow: hidden;

  span {
    display: block;
    margin-left: calc(20% + 12px);
    width: calc(60% - 24px);
  }
}


.option:hover {
  cursor: pointer;
}


// options
article.optionsArray {
  text-align: right;
  margin-left: 15%;
  border: 1px solid var(--color-dark);
  background-color: var(--color-bright);  
  border-radius: var(--bubble-border-radius);
  max-width: 70%;

  h5 {
    margin:12px;
    padding:0;
    font-weight: normal;
    text-align: center;
    color: var(--color-orange);
  }
  span {
    margin: 12px;
    width: auto;
    max-width: initial;
    box-sizing: border-box;
    & + span {
      margin-top: 0;
    }  
  }
}

// button of option and options
article.optionsArray span,
article.option span {
  /*word-break: break-all;*/
  border-radius: var(--bubble-border-radius);
  border: 1px solid var(--color-dark);
  font-weight: bold;
  font-size: 15px;
  line-height: 16px;
  padding: 12px;
  text-transform: uppercase;
  display: block;
  text-align:center;
  background-color: var(--color-dark);
  color: var(--color-bright);
  letter-spacing: var(--letter-spacing-bold);
  cursor: pointer;
  //word-break: break-all;

  &.inactive {
    opacity: 0.25;
    border: none;
  }

  &.selected {
    // background-color: #0074D9;
  }
}


.qr-code {
  padding: 5px;
}



</style>