<script>
  import { beforeUpdate, afterUpdate, onMount, onDestroy } from 'svelte';
  import { joinRoom, leaveRoom, listenForMessages, stopListening, emitMessage, getPlayerId } from './socketClient.js';
  import { getConfig } from './util.js';

  import ItemBubble from './ItemBubble.svelte';
  import QRScanner from './QRScanner.svelte';
  import Camera from './Camera.svelte';

  export let authoring;
  export let playerNodeId;
  export let setEditNodeId = ()=>{console.log("setEditNodeId not implemented in stand-alone player")}
  export let setPlayerNodeId;
  export let loadHistory = false;
  export let updateUnseenMessages;
  
  let currentPlayerNode = null;
  
  let div;
  let autoscroll;
  let items = [];
  let inputValue;
  let googleMapsAPIKey;

  let fileServerURL;
  let historyLoaded = false;

  const init = async (nodeId)=> {

    inputValue = "";

    let response = await fetch("/api/scriptNode/" + nodeId);
    currentPlayerNode = await response.json();
    console.log("init currentPlayerNode", currentPlayerNode._id);

    fileServerURL = await getConfig("fileServerURL");
    console.log(fileServerURL);

    let joinNode = nodeId;
    let execOnArrive = true;

    // if loadHistory -> pass into items
    if(loadHistory && !historyLoaded) {
      let playerId = getPlayerId();
      let query = {
        board: currentPlayerNode.board,
        recipients: playerId,
      }
      let response = await fetch("/api/message?$sort=timestamp&$where=" +  JSON.stringify(query));
      let historyItems = await response.json();
      console.log(historyItems.docs);
      historyItems.docs.forEach(async item=>{
        let i = parseItem(item);
        if(i) items.push(i);
        if(!item.seen || item.seen.indexOf(playerId) == -1)
          await fetch("/api/message/"+item._id+"/markAsSeen/" + playerId, {method: "PUT"});
      });
      items = items;
      historyLoaded = true;
      updateUnseenMessages();

      // find where player is now on this board
      response = await fetch("/api/nodeLog?player="+playerId+"&board="+currentPlayerNode.board);
      let lastNode = await response.json();
      console.log("lastNode", lastNode);
      if(lastNode.docs.length) {
        joinNode = lastNode.docs[0].node;
        execOnArrive = false;
      }
    }

    joinRoom(joinNode, execOnArrive);

    listenForMessages(async (message)=>{
      console.log("message received", message);

      let item = {...message};

      if(!item.seen || item.seen.indexOf(getPlayerId()) == -1)
          await fetch("/api/message/"+item._id+"/markAsSeen/" + getPlayerId(), {method: "PUT"});

      if(!item.attachment) item.attachment = {};
      if(!item.params) item.params = {};

      if(item.params.moveTo) {
        setPlayerNodeId(item.params.moveTo);
        setEditNodeId(item.params.moveTo);
      }

      if(item.attachment.mediatype) {
        item.side = "left";
        if(item.attachment.mediatype == "image") {
          item.attachment.imgSrc = fileServerURL + item.attachment.filename;
        }
        if(item.attachment.mediatype == "audio") {
          item.attachment.audioSrc = fileServerURL + item.attachment.filename;
        }
        items.push(item);
        items.sort((a,b)=>a.timestamp-b.timestamp);
        items = items; 
        console.log(items);  
      }

      if(message.message) {

        let isSystemMessage = message.system || message.label == "system";
        let showPlaceholder = !(isSystemMessage || message.params.option);

        items.push({...item, 
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

    googleMapsAPIKey = await getConfig("googleMapsAPIKey");
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

  const parseItem = (rawItem) => {
    if(!rawItem.attachment) rawItem.attachment = {};
    if(!rawItem.params) rawItem.params = {};

    if(rawItem.system && rawItem.params.moveTo) return null;
    if(rawItem.params.option) return null;

    if(rawItem.attachment.mediatype == "image") {
      rawItem.attachment.imgSrc = fileServerURL + rawItem.attachment.filename;
    }
    if(rawItem.attachment.mediatype == "audio") {
      rawItem.attachment.audioSrc = fileServerURL + rawItem.attachment.filename;
    }

    let isSystemMessage = rawItem.system || rawItem.label == "system";
        
    return {
      ...rawItem,
      side: rawItem.sender == getPlayerId() ? "right" : (isSystemMessage ? "system" : "left"),
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
      message: inputValue,
      attachment: {},
      params: {}
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
      items = items.filter((i)=>!(i.params && i.params.option));
    }, delay * (item.message.length+5));
  }

  const sendQRCode = (code) => {
    let item = {
      message: "[QR code scanned]",
      attachment: {QRCode: code},
      params: {}
    }
    items = items.concat({...item, side: "right"});
    emitMessage(item);
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
  const openQRScanner = ()=> { QRScannerOpen = true; }
  const closeQRScanner = ()=> {
    QRScannerOpen = false;
    closeAttachmentMenu();
  }

  let cameraOpen = false
  const openCamera = ()=> {
    cameraOpen = true;
  }
  const closeCamera = ()=> {
    cameraOpen = false;
    closeAttachmentMenu();
  }

  const getGPSLocation = ()=>{
    if(navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position)=>{
        console.log("gps", position.coords);

        let mapUrl = "https://www.google.com/maps/@"+position.coords.latitude+","+position.coords.longitude+",18z";
        let mapImgUrl = 
          "https://maps.googleapis.com/maps/api/staticmap?center="
          +position.coords.latitude+","+position.coords.longitude
          +"&zoom=18&size=150x150"
          +"&markers=size:small%7Ccolor:blue%7C"+position.coords.latitude+","+position.coords.longitude
          +"&key="+googleMapsAPIKey;
        
        let item = {
          attachment: {
            mediatype: "GPS",
            imgSrc: mapImgUrl,
            imgLink: mapUrl,  
            lat: position.coords.latitude, 
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          },
          params: {},
        }

        items = items.concat({...item, side: "right"});
        emitMessage(item);
        inputValue = "";
      });
    } else {
      alert("geolocation not supported");
    }
    closeAttachmentMenu();
  }

  const sendImage = async (filename) => {
    let fileServerURL = await getConfig("fileServerURL");
    let item = {
      attachment: {
        mediatype: "image",
        imgSrc: fileServerURL + filename,  
        filename: filename
      },
      params: {}
    }
    items = items.concat({...item, side: "right"});
    emitMessage(item);
    inputValue = "";
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
        <button on:click={openCamera}>Camera</button>
        <button on:click={openQRScanner}>QR Code</button>
        <button on:click={getGPSLocation}>GPS Location</button>
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

  {#if cameraOpen}
    <div class="qr-scanner-container">
      <button class="close-qr" on:click={closeCamera}>close</button>
      <Camera
        onUpload={async (imageURL)=>{
          closeCamera();
          await sendImage(imageURL);
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