<script>
  import { beforeUpdate, afterUpdate, onMount, onDestroy } from 'svelte';
  import { joinRoom, leaveRoom, listenForMessages, stopListening, emitMessage } from './socketClient.js';

  import ItemBubble from './ItemBubble.svelte';
  import QRScanner from './QRScanner.svelte';

  export let authoring;
  export let playerNodeId;
  export let setEditNodeId = ()=>{console.log("setEditNodeId not implemented in stand-alone player")}
  export let setPlayerNodeId;
  
  let currentPlayerNode = null;
  
  let div;
  let autoscroll;
  let items = [];
  let inputValue;

  const init = async (nodeId)=> {

    inputValue = "";

    let response = await fetch("/api/scriptNode/" + nodeId);
    currentPlayerNode = await response.json();
    console.log("init currentPlayerNode", currentPlayerNode._id);

    joinRoom(nodeId);

    listenForMessages((message)=>{
      console.log("message received", message);

      if(message.moveTo) {
        setPlayerNodeId(message.moveTo);
        setEditNodeId(message.moveTo);
      }

      if(message.message) {

        let isSystemMessage = message.system || message.label == "system";
        let showPlaceholder = !(isSystemMessage || message.option);

        items.push({...message, 
          side: isSystemMessage ? "system" : "left",
          placeholder: showPlaceholder,
        });
        items.sort((a,b)=>a.timestamp-b.timestamp);
        items = items;

        if(showPlaceholder)
          setTimeout(() => {
            items.forEach((comment, index)=> {
              if(items[index].placeholder) {
                items[index].placeholder = false;
              }
            });
          }, 500);
      }
    })    
  }

  $: {
    if(!currentPlayerNode || 
       (currentPlayerNode && (playerNodeId != currentPlayerNode._id))) {
      console.log("playerNodeId changed", currentPlayerNode ? currentPlayerNode._id : "null", playerNodeId);
      if(currentPlayerNode) {
        leaveRoom(currentPlayerNode._id);    
      }
      init(playerNodeId);
    }
  }

  onDestroy(() => {
    leaveRoom(currentPlayerNode._id);
    stopListening();
  })

  beforeUpdate(() => {
    autoscroll = div && (div.offsetHeight + div.scrollTop) > (div.scrollHeight - 20);
  });

  afterUpdate(() => {
    if (autoscroll) div.scrollTo(0, div.scrollHeight);
  });

  const submitInput = ()=>{
    if (!inputValue) return;

    items = items.concat({
      side: 'right',
      message: inputValue
    });

    emitMessage({message: inputValue});
    inputValue = "";
  }

  const handleKeydown = (event)=>{
    if (event.which === 13) {
      submitInput();
    }
  }

  let autoTyping = false;

  const autoType = (item) => {
    if(autoTyping) return;
    autoTyping = true;
    let delay = 70;
    const type = (text, delay) => {
      let character = text.substr(0,1);
      let remaining = text.substr(1);
      inputValue += character;
      if (remaining != "") setTimeout(()=>{type(remaining, delay)}, delay);
    }
    type(item.message, delay);

    setTimeout(()=>{
      submitInput();
      autoTyping = false;
      items = items.filter((i)=>!i.option);
    }, delay * (item.message.length+5));
  }

  const sendQRCode = (code) => {
    let item = {
      side: 'right',
      message: "[QR code scanned]",
      QRCode: code
    }
    items = items.concat(item);
    emitMessage({message: item.message, QRCode: code});
    inputValue = "";
  }

  const reEnter = ()=> {
    leaveRoom(currentPlayerNode._id);
    items = [];
    setTimeout(()=>{
      init(currentPlayerNode._id);  
    }, 50);
  }

  let attachmentMenuOpen = false;
  const openAttachmentMenu = ()=> {
    console.log("open attachment");
    attachmentMenuOpen = true;
  }
  const closeAttachmentMenu = ()=>{
    attachmentMenuOpen = false;
  }

  let QRScannerOpen = false
  const openQRScanner = ()=> {
    QRScannerOpen = true;
  }
  const closeQRScanner = ()=> {
    QRScannerOpen = false;
    closeAttachmentMenu();
  }


</script>

<div class="chat {authoring ? 'chat-authoring' : 'chat-player'}">

    <div class="scrollable" bind:this={div}>
      {#each items as item}
        <ItemBubble 
          {item}
          onClick={()=>{autoType(item)}}
        />
      {/each}
    </div>

    {#if !attachmentMenuOpen}
      <div class="input-container">
        <button class="open-attachment" on:click={openAttachmentMenu}>📎</button>
        <input bind:value={inputValue} on:keydown={handleKeydown}>
      </div>
    {:else}
      <div class="input-container">
        <button on:click={openQRScanner}>QR Scanner</button>
        <button class="close-attachment" on:click={closeAttachmentMenu}>close</button>
      </div>  
    {/if}

  {#if QRScannerOpen}
    <div class="qr-scanner-container">
      <button class="close-qr" on:click={closeQRScanner}>close</button>
      <QRScanner
        onScan={(code)=>{
          closeQRScanner();
          sendQRCode(code);
        }}
      />
    </div>

  {/if}
  
</div>

{#if authoring}
  <div class="chat-debug">{currentPlayerNode ? currentPlayerNode.name : ""}</div>
  <div class="author-buttons">
    <button on:click={reEnter}>clear & re-enter</button>
    <button on:click={()=>setEditNodeId(currentPlayerNode._id)}>edit code</button>
  </div>
{/if}


<style>
  button:hover {
    cursor: pointer;
  }

  .chat {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
  }

  .chat-authoring {
    bottom: 50px;
  }

  .chat-player {
    bottom: 0;
  }

  .scrollable {
    margin: 0 0 0.5em 0;
    overflow-y: auto;
    position: absolute;
    top: 0;
    bottom: 35px;
    left: 0;
    right: 0;
    padding: 5px;
  }

  .input-container {
    width: 100%;
    padding-left: 5px;
    padding-right: 5px;
    position: absolute;
    bottom: 0px;
    left: 0px;
    box-sizing: border-box;
    display: flex;
  }

  .input-container button {
    margin-right: 5px;
  }

  .close-attachment {
    position: absolute;
    right: 0;
    top: 0;
  }

  input {
    flex: auto;
  }

  .qr-scanner-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }

  .close-qr {
    position: absolute;
    top: 5px;
    right: 5px;
  }

  .chat-debug {
    position: absolute;
    bottom: 10px;
    left: 10px;
    font-size: 10px;
  }

  .author-buttons {
    position: absolute;
    bottom: 5px;
    right: 5px;
    width: auto;
    margin-bottom: 0px;
  }
</style>