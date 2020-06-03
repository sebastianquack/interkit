<script>
  import { beforeUpdate, afterUpdate, onMount, onDestroy } from 'svelte';
  import { joinRoom, leaveRoom, emitMessage, getPlayerId } from '../../shared/socketClient.js';
  import { getConfig } from '../../shared/util.js';

  import ItemBubble from './ItemBubble.svelte';
  import AttachmentToolbelt from './AttachmentToolbelt.svelte';

  // main props passed in from the outside
  export let playerId;
  export let currentBoard;
  
  // props to communicate with player container
  export let registerMessageHandler;
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

  let attachmentMenuOpen = false;
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
    registerMessageHandler(null);
    updatePlayerNodeId(null);
    
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

    // make sure this has been loaded when we register the handler
    fileServerURL = await getConfig("fileServerURL");

    // set up socket events
    registerMessageHandler(async (message)=>{
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

      if(!fileServerURL) fileServerURL = await getConfig("fileServerURL");

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

    {#if !attachmentMenuOpen}
      <div class="input-container">      
        <button style="width: 2em" class="open-attachment" on:click={()=>{attachmentMenuOpen = true}}>📎</button>
        <input bind:value={inputValue} on:keydown={handleKeydown} on:click={scrollUp}>
      </div>
    {/if}
    
    <AttachmentToolbelt
      {attachmentMenuOpen}
      closeAttachmentMenu={()=>{attachmentMenuOpen = false}}
      {scrollUp}
      {googleMapsAPIKey}
      addItem={(i)=>items = items.concat({...i})}
      clearInput={()=>inputValue = ""}
    />
  
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