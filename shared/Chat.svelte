<script>
  import { beforeUpdate, afterUpdate, onMount, onDestroy } from 'svelte';
  import { joinRoom, leaveRoom, listenForMessages, stopListening, emitMessage, getPlayerId } from './socketClient.js';
  import { getConfig } from './util.js';

  import ItemBubble from './ItemBubble.svelte';
  import QRScanner from './QRScanner.svelte';
  import Camera from './Camera.svelte';


  // main props passed in from the outside
  export let playerId;
  export let currentBoard;
  
  // props to communicate with player container
  export let mainView;
  export let updateUnseenMessages;
  export let mapClick;
  export let setNotificationItem = ()=>{}; 
  export let setLockScreen = ()=>{};

  // optional props from authoring system
  export let authoring;
  export let setEditNodeId = ()=>{console.log("setEditNodeId not implemented in stand-alone player")}
  export let togglePlayerInfo = (playerId)=>{};
  export let updatePlayerNodeId;  

  let currentNode = null; // this is the full object of the current node stored in playerodeId
  let items = []; // these are all the chat items currently displayed

  let inputValue;
  let showItemsSince = Date.now();
  let showMoreItems = false;
  let beginningHistory = false;
  
  let div;
  let autoscroll;
  let autoTyping = false;
  let googleMapsAPIKey;
  let fileServerURL;
  
  
  // reactive & lifecycle methods

  onMount(async ()=>{
    googleMapsAPIKey = await getConfig("googleMapsAPIKey");
    fileServerURL = await getConfig("fileServerURL");
  })

  $: {
    if(currentBoard)
      if(currentBoard._id && playerId) {
        console.log("board or player changed, re-init chat", currentBoard._id);
        reset();
      }
  }

  const reset = ()=>{
    currentNode = null;
    items = [];
    showItemsSince = Date.now();
    let showMoreItems = false;
    let beginningHistory = false;
    inputValue = "";
    init();
  }

  onDestroy(() => {
    if(currentNode)
      leaveRoom(currentNode._id);
  })

  const init = async ()=> {
    
    console.log("chat init method");
  
    let joinNodeId = currentBoard.startingNode;      
    let execOnArrive = true;
    
    // load history 
    loadMoreItems(currentBoard);
    scrollUp();

    // find where player is now on this board
    let response = await fetch("/api/nodeLog?player="+playerId+"&board="+currentBoard._id);
    let lastNode = await response.json();
    console.log("lastNode", lastNode);
    if(lastNode.docs.length) {
      joinNodeId = lastNode.docs[0].node;
      execOnArrive = false; // if arrived here after history, don't exec onArrive
    }
    
    // loads node we want to be in and saves it
    await setCurrentNode(joinNodeId, execOnArrive)

    // set up socket events
    listenForMessages(async (message)=>{
      console.log("currentBoard", currentBoard);
      console.log("currentNode", currentNode);
      console.log("message received", message);

      let item = {...message};
      if(!item.attachment) item.attachment = {};
      if(!item.params) item.params = {};

      // if this is a scheduled message but from a different board, show notification, don't add message to this board
      if(currentBoard._id != message.board) {
          console.log("warning, message is from a different board")
          setNotificationItem({...item, side: "left"});
          setLockScreen();
          return;
      }

      //if this was a scheduled item from a different node on the same board, switch back to that node without execOnArrive
      if(currentBoard._id == message.board && currentNode._id != message.node) {
          console.log("warning, message is from a different node")
          await setCurrentNode(message.node, false);
          setEditNodeId(message.node);  
      }

      if(!item.seen || item.seen.indexOf(getPlayerId()) == -1)
          await fetch("/api/message/"+item._id+"/markAsSeen/" + getPlayerId(), {method: "PUT"});
      
      // respond to moveTo message
      if(item.params.moveTo) {
        setTimeout(async ()=>{
          console.log("moveTo", item.params.moveTo);
          await setCurrentNode(item.params.moveTo, true);
          setEditNodeId(item.params.moveTo);  
        }, item.params.moveToDelay ? item.params.moveToDelay : 0);
      }

      if(item.params.interfaceCommand) {
        if(item.params.interfaceCommand == "lock") {
          setLockScreen();
        }
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
        setNotificationItem(item);
        items.sort((a,b)=>a.timestamp-b.timestamp);
        items = items; 
        console.log(items);  
        scrollUp();
      }

      if(item.message) {

        let isSystemMessage = message.system || message.label == "system";
        let showPlaceholder = !(isSystemMessage || message.params.option);

        items.push({...item, 
          side: isSystemMessage ? "system" : "left",
          placeholder: showPlaceholder,
        });
        items.sort((a,b)=>a.timestamp-b.timestamp);
        items = items;
        scrollUp();

        setNotificationItem({...item, 
          side: isSystemMessage ? "system" : "left",
          placeholder: false,
        });

        if(showPlaceholder)
          setTimeout(() => {
            items.forEach((comment, index)=> {
              if(items[index].placeholder) {
                items[index].placeholder = false;
                scrollUp();
              }
            });
          }, 500);
      }
    
      if(mainView=="map" || mainView == "archive") {
        setNotificationItem({...item, side: "left"});
        setLockScreen();
      }

    })    
    
  }

  const setCurrentNode = async (nodeId, execOnArrive=true)=>{
  
    let response = await fetch("/api/scriptNode/" + nodeId);
    currentNode = await response.json();
    
    joinRoom(nodeId, execOnArrive);
    
    if(updatePlayerNodeId) updatePlayerNodeId(nodeId);
  }


  const loadMoreItems = async (board = currentBoard) => {
      console.log("loadMoreItems");
      console.log("loading items earlier than", showItemsSince);  
      let query = {
        board: board._id,
        recipients: playerId,
        timestamp: {$lt: showItemsSince},
        scheduled: {$ne: true}
      }
      let limit = 10;
      let response = await fetch("/api/message?$sort=-timestamp&$limit="+limit+"&$where=" +  JSON.stringify(query));
      let historyItems = await response.json();
      console.log(historyItems.docs);
      if(historyItems.docs.length) {
        console.log(historyItems.docs[historyItems.docs.length - 1].timestamp);
        showItemsSince = historyItems.docs[historyItems.docs.length - 1].timestamp;
        console.log("showItemsSince", showItemsSince);  
      }
      if(historyItems.docs.length < limit) {
        showMoreItems = false;
        beginningHistory = true;
      } else {
        showMoreItems = true;
      }
      let activeOptions = true; // show options only if they are the last ones at bottom
      historyItems.docs.forEach(async item=>{        
        if(!item.params) item.params = {};
        if(!item.params.option || (activeOptions && item.params.option)) {
          let i = parseItem(item);
          if(i) items.unshift(i);
          if(!item.seen || item.seen.indexOf(playerId) == -1)
            await fetch("/api/message/"+item._id+"/markAsSeen/" + playerId, {method: "PUT"});
        }
        if(!item.params.option) activeOptions = false;
      });
      items = items;
      updateUnseenMessages();
  } 

  const parseItem = (rawItem) => {
    if(!rawItem.attachment) rawItem.attachment = {};
    if(!rawItem.params) rawItem.params = {};

    if(rawItem.params.interfaceCommand) return null;

    if(rawItem.system && rawItem.params.moveTo) return null;
    
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

  const scrollUp = ()=> {
    setTimeout(()=>{
      if(div)
        div.scrollTo(0, div.scrollHeight);
    }, 400);
  }

  const submitInput = ()=>{
    if (!inputValue) return;

    items = items.concat({
      side: 'right',
      message: inputValue,
      attachment: {},
      params: {}
    });
    items = items.filter((i)=>!(i.params && i.params.option));
    scrollUp();

    emitMessage({message: inputValue});
    inputValue = "";
  }

  const handleKeydown = (event)=>{
    if (event.which === 13) {
      submitInput();
    }
  }

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
    scrollUp();
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
          //+"&markers=size:small%7Ccolor:black%7C"+position.coords.latitude+","+position.coords.longitude
          +"&key="+googleMapsAPIKey
          +"&style=element:geometry%7Ccolor:0xf5f5f5&style=element:labels.icon%7Cvisibility:off&style=element:labels.text.fill%7Ccolor:0x616161&style=element:labels.text.stroke%7Ccolor:0xf5f5f5&style=feature:administrative.land_parcel%7Celement:labels.text.fill%7Ccolor:0xbdbdbd&style=feature:poi%7Celement:geometry%7Ccolor:0xeeeeee&style=feature:poi%7Celement:labels.text.fill%7Ccolor:0x757575&style=feature:poi.park%7Celement:geometry%7Ccolor:0xe5e5e5&style=feature:poi.park%7Celement:labels.text.fill%7Ccolor:0x9e9e9e&style=feature:road%7Celement:geometry%7Ccolor:0xffffff&style=feature:road.arterial%7Celement:labels.text.fill%7Ccolor:0x757575&style=feature:road.highway%7Celement:geometry%7Ccolor:0xdadada&style=feature:road.highway%7Celement:labels.text.fill%7Ccolor:0x616161&style=feature:road.local%7Celement:labels.text.fill%7Ccolor:0x9e9e9e&style=feature:transit.line%7Celement:geometry%7Ccolor:0xe5e5e5&style=feature:transit.station%7Celement:geometry%7Ccolor:0xeeeeee&style=feature:water%7Celement:geometry%7Ccolor:0xc9c9c9&style=feature:water%7Celement:labels.text.fill%7Ccolor:0x9e9e9e&";
        
        let item = {
          attachment: {
            mediatype: "GPS",
            imgSrc: mapImgUrl,
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
    scrollUp();
  }

</script>

<div class="chat {authoring ? 'chat-authoring' : 'chat-player'}">

    <div class="scrollable" bind:this={div}>
      {#if showMoreItems} <button class="load-more" on:click={()=>loadMoreItems()}>load older messages</button> {/if}
      {#if beginningHistory} <!--small class="history-start"></small--> {/if}
      {#each items as item}
        <ItemBubble 
          {item}
          onClick={()=>{
            if(item.params.option) autoType(item)
            if(item.attachment.mediatype == "GPS") mapClick(item)
          }}
        />
      {/each}
    </div>

    <div class="input-container">      
    {#if !attachmentMenuOpen}
        <button style="width: 2em" class="open-attachment" on:click={openAttachmentMenu}>📎</button>
        <input bind:value={inputValue} on:keydown={handleKeydown} on:click={scrollUp}>
    {:else}
        <button on:click={openCamera}>Camera</button>
        <button on:click={openQRScanner}>QR Code</button>
        <button on:click={getGPSLocation}>GPS Location</button>
        <button class="close-attachment" on:click={closeAttachmentMenu}>close</button>
    {/if}
    </div>  

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
      <Camera
        onUpload={async (imageURL)=>{
          closeCamera();
          await sendImage(imageURL);
        }}
        onClose={closeCamera}
      />
    </div>
  {/if}
  
</div>

{#if authoring}
  <div class="chat-debug">{currentNode ? currentNode.name : ""}</div>
  <div class="author-buttons">
    <!--button on:click={reEnter}>clear & re-enter</button-->
    <button on:click={()=>setEditNodeId(currentNode._id)}>edit code</button>
    <button on:click={()=>togglePlayerInfo(playerId)}>player info</button>
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
    margin: 0 0 10px 0;
    overflow-y: auto;
    position: absolute;
    top: 0;
    bottom: 45px;
    left: 0;
    right: 0;
    padding: 5px;
    padding-top: 10px;
    padding-bottom: 10px;
  }

  .input-container {
    background-color: white;
    width: 100%;
    padding-left: 10px;
    padding-right: 10px;
    padding-top: 10px;
    position: absolute;
    bottom: 0px;
    left: 0px;
    box-sizing: border-box;
    display: flex;
    border-top: 1px solid gray;
    height: 55px;
  }

  .input-container button {
    margin-right: 10px;
  }

  .close-attachment {
    position: absolute;
    right: 0;
    top: 10px;
  }

  input {
    flex: auto;
    margin-bottom: 10px;
  }

  button {
    margin-bottom: 10px;
  }

  button.load-more {
    left: 50%;
    transform: translateX(-50%);
    position: relative;
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