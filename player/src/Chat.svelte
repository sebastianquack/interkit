<script>
  import { beforeUpdate, afterUpdate, onMount, onDestroy } from 'svelte';
  import { getConfig, postPlayerMessage } from '../../shared/util.js';

  import ChatItemBubble from './ChatItemBubble.svelte';
  import AttachmentToolbelt from './AttachmentToolbelt.svelte';

  // main props passed in from the outside
  export let playerId;
  export let projectId;
  export let currentBoard;
  
  // props to communicate with player container
  export let registerMessageHandler;
  export let mainView;
  export let updateUnseenMessages;
  export let mapClick;
  export let setNotificationItem = ()=>{}; 
  export let showLockScreen; 
  export let setLockScreen = ()=>{};
  export let displayAlert;
  export let openChatView; // opens chat view (if in map or archive)
  export let openBoardFromNodeId; // changes currentBoard

  // optional props from authoring system
  export let authoring;
  export let setEditNodeId = ()=>{console.log("setEditNodeId not implemented in stand-alone player")}
  export let updatePlayerNodeId;  

  let currentNode = null; // this is the full object of the current node stored in playerodeId
  let chatItems = []; // these are all the chat chat items currently displayed

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

  let messageQueue = []; // queue messages for sequencial processing if many come in fast via socket
  let status = "idle";
  
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
    chatItems = [];
    showItemsSince = Date.now();
    let showMoreItems = false;
    let beginningHistory = false;
    inputValue = "";
    init();
  }

  onDestroy(() => {
    console.log("chat onDestroy");
    registerMessageHandler(null);
    if(updatePlayerNodeId)
      updatePlayerNodeId(null);
    
    // not implemented yet
    /*if(currentNode)
      leaveNode(playerId, currentNode._id);
    */
  })

  const init = async ()=> {
    console.log("chat init method");
    //console.log("playerId", playerId);
    //console.log("currentBoard", currentBoard);
  
    let nodeId = currentBoard.startingNode;       

    if(!nodeId) {
      alert("startingNode not defined")
    }

    let firstTimeOnBoard = true // flag to see if we are on the board for the very first time

    // load history 
    await loadMoreItems(currentBoard); 
    scrollUp();

    // find where player is now on this board
    let response = await fetch("/api/nodeLog?player="+playerId+"&board="+currentBoard._id);
    let lastNode = await response.json();
    console.log("lastNode", lastNode);
    if(lastNode.docs.length > 0) {
      nodeId = lastNode.docs[0].node;
      firstTimeOnBoard = false; // there is history, we have been here before
    }
    
    // make sure this has been loaded when we register the handler
    fileServerURL = await getConfig("fileServerURL");

    // set up socket events
    registerMessageHandler(async (message)=>{
      console.log("chat message received, putting in queue");
      messageQueue.push(message);
      console.log("messageQueue.length", messageQueue.length);

      if(messageQueue.length == 1) {
        console.log("start processing queue");
        processQueue();
      } else {
        console.log("message handler busy, waiting...");
      }
    })

    // loads node we want to be in and saves it
    await setCurrentNode(nodeId)
    
    // todo: move this logic to server!
    if(firstTimeOnBoard && nodeId) {
      // new: use rest api here for better error handling
      let res = await fetch("/api/nodeLog/logPlayerToNode/" + playerId + "/" + nodeId, {method: "POST"});
      if(!res.ok) {
        console.log("could not reach server");
      }
      let resJSON = await res.json();
      console.log("logPlayerToNode", resJSON);
      if(!resJSON.status == "ok") {
        alert("error logging player to node - please check your internet connection");
        // todo - give option to retry
      }
      if(resJSON.statusCode == 500) {
        alert(resJSON.error)
      }

    }

    // we are ready receive messages
    status = "ready"
  }

  const processQueue = async () => {
    await handleMessage(messageQueue[0])

    console.log("messageHandler done, shifting...")
    messageQueue.shift() // remove the message at position 0
    console.log("messageQueue.length", messageQueue.length)
    if(messageQueue.length >= 1) {
      processQueue();
    } else {
      console.log("reached end of message queue");
    }
  }

  const handleMessage = async (message) => {
    console.log("handling message", message);

    if(status != "ready") {
      console.log("we are not ready, cancelling")
      return;
    }

    // sanitise message to become a chat item
    let item = {...message};
    if(!item.attachment) item.attachment = {};
    if(!item.params) item.params = {};

    // message comes from a different board
    if(currentBoard._id != item.board) {
        console.log("warning, message is from a different board")

        if(item.forceOpen) {
          console.log("forceOpen: openening different board, cancelling queue here")
          openBoardFromNodeId(item.node)
          messageQueue = []; // remove items from queue, board reloads them anyway
          status = "resetting"
          return;
        }

        // notification
        if(!item.params.interfaceCommand && !item.forceOpen) {
          console.log("displaying as notification")
          setNotificationItem(item);
          setLockScreen();
          return;
        }
    }

    // request for geoposition
    if(item.params.interfaceCommand == "request-geoposition") {
      console.log("geoposition requested, responding...")
      if(navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((position)=>{
          let item = {
            attachment: {
              mediatype: "GPS",
              lat: position.coords.latitude, 
              lng: position.coords.longitude,
              accuracy: position.coords.accuracy
            },
            params: {
              interfaceCommand: "request-geoposition-response"
            },
            node: currentNode._id, board: currentNode.board, project: projectId, sender: playerId        
          }
          postPlayerMessage(item)
        })
      }
      return; 
    }

    // switch player to chat view of foreOpen is set
    if(item.forceOpen && mainView != "chat") {
      openChatView();
    }

    //if this comes from a different node on the same board, quietly switch to that node
    if(currentBoard._id == message.board && currentNode._id != message.node) {
        console.log("warning, message is from a different node")
        if(message.recipients.includes(playerId)) {
          await setCurrentNode(message.node);
          setEditNodeId(message.node);    
        } else {
          console.log("message wasn't for me, ignoring");
          return;
        }
    }

    if(!item.seen || item.seen.indexOf(playerId) == -1)
        await fetch("/api/message/"+item._id+"/markAsSeen/" + playerId, {
          method: "PUT",
          headers: {
            'Content-Type': 'application/json'
          },            
        });

    if(item.params.interfaceCommand) {
      if(item.params.interfaceCommand == "alert") {
        displayAlert(item.params.interfaceOptions);
      }

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
        item.attachment.autoplay = true;
      }
      chatItems.push(item);
      sortItems();
      console.log(chatItems);  
      scrollUp();
    }

    let isSystemMessage = false;

    if(item.message) {

      isSystemMessage = message.system || message.label == "system";
      let showPlaceholder = !(isSystemMessage || item.params.option);

      chatItems.push({...item, 
        side: isSystemMessage ? "system" : "left",
        placeholder: showPlaceholder,
      });
      sortItems();
      scrollUp();

      if(showPlaceholder)
        setTimeout(() => {
          chatItems.forEach((comment, index)=> {
            if(chatItems[index].placeholder) {
              chatItems[index].placeholder = false;
              scrollUp();
            }
          });
        }, 500);
    }

    //console.log("mainView", mainView)
    //console.log("item", item)
    if(mainView=="map" || mainView == "archive" || showLockScreen) {
      if(!item.params.interfaceCommand && !item.params.option) {
        setNotificationItem({...item, side: isSystemMessage ? "system" : "left"});
        setLockScreen();  
      }
    }

    return;

  }

  // simply loads and sets the curret node
  const setCurrentNode = async (nodeId)=>{
    console.log("loading currentNode");
    let response = await fetch("/api/scriptNode/" + nodeId);
    currentNode = await response.json();
    //console.log("currentNode set to", currentNode);
    if(!currentNode) {
      alert("currentNode " + currentNode)
    }
    if(updatePlayerNodeId) updatePlayerNodeId(nodeId); // this is just to keep authoring interface up to date with player
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
      let response = await fetch("/api/message?$sort=-timestamp&$sort=-outputOrder&$limit="+limit+"&$where=" +  JSON.stringify(query));
      let historyItems = await response.json();
      console.log("history loaded", historyItems.docs);
      if(historyItems.docs.length) {
        //console.log(historyItems.docs[historyItems.docs.length - 1].timestamp);
        showItemsSince = historyItems.docs[historyItems.docs.length - 1].timestamp;
        console.log("showItemsSince", showItemsSince);  
      }
      if(historyItems.docs.length < limit) {
        showMoreItems = false;
        beginningHistory = true;
      } else {
        showMoreItems = true;
      }
      // show options only if they are the last ones at bottom
      // TODO: disable but still show old options!
      let activeOptions = true; 
      for(let i = 0; i < historyItems.docs.length; i++) {
        let item = historyItems.docs[i];
        if(!item.params) item.params = {};
        if(!item.params.option || (activeOptions && item.params.option)) {
          let i = parseItem(item);
          if(i) chatItems.unshift(i);
          if(!item.seen || item.seen.indexOf(playerId) == -1)
            await fetch("/api/message/"+item._id+"/markAsSeen/" + playerId, {
              method: "PUT",
              headers: {
                'Content-Type': 'application/json'
              },              
              });
        }
        if(!item.params.option && !item.params.interfaceCommand) activeOptions = false;
      }
      chatItems = chatItems;
      updateUnseenMessages();
  } 

  const sortItems = () => {
    chatItems.sort((a,b)=> {
      let x = a.timestamp - b.timestamp;
      return x == 0 ? a.outputOrder - b.outputOrder : x;
    });
    //items.sort((a,b)=>a.timestamp-b.timestamp);
    chatItems = chatItems;
    console.log("sorted items", chatItems);
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
      side: rawItem.sender == playerId ? "right" : (isSystemMessage ? "system" : "left"),
    }
  }

  const scrollUp = ()=> {
    setTimeout(()=>{
      if(div)
        div.scrollTo(0, div.scrollHeight);
    }, 400);
  }

  const submitInput = (item = null)=>{
    console.log("submitInput", item)
    if (!inputValue && !item) return;

    chatItems = chatItems.concat({
      side: 'right',
      message: item ? item.message : inputValue,
      attachment: {},
      params: {}
    });
    chatItems = chatItems.filter((i)=>!(i.params && i.params.option));
    scrollUp();
    
    let res = postPlayerMessage({
      sender: playerId, 
      message: item ? item.message : inputValue, 
      node: currentNode._id, 
      board: currentBoard._id, 
      project: projectId,
      params: item ? item.params : undefined,
    });
    inputValue = "";

    // todo handle errors
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
      submitInput(item);
      autoTyping = false;
    }, delay * (item.message.length+5));
  }

  const collapseMessages = () => {
    showItemsSince = Date.now();
    showMoreItems = true;
    chatItems = [];
  }

</script>

<div class="chat">

    <div class="scrollable {authoring? 'narrow' : ''}" bind:this={div}>
      {#if showMoreItems} <button class="load-more" on:click={()=>loadMoreItems()}>load older messages</button> {/if}
      {#if beginningHistory} <!--small class="history-start"></small--> {/if}
      {#each chatItems as item}
        <ChatItemBubble 
          {item}
          onClick={()=>{
            if(item.params.option) {
              if(!item.params.key) {
                autoType(item)
              } else {
                submitInput(item);
              }
            }
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
      {playerId}
      {projectId}
      {currentNode}
      {attachmentMenuOpen}
      closeAttachmentMenu={()=>{attachmentMenuOpen = false}}
      {scrollUp}
      {googleMapsAPIKey}
      addItem={(i)=>chatItems = chatItems.concat({...i})}
      clearInput={()=>inputValue = ""}
    />

    {#if authoring}
      <div class="authoring-tools">
        <div class="chat-debug">{currentNode ? currentNode.name : ""}</div>
        <div class="author-buttons">
          <!--button on:click={reEnter}>clear & re-enter</button-->
          <button on:click={()=>setEditNodeId(currentNode._id)}>edit code</button>
          <button on:click={collapseMessages}>hide msgs</button>
        </div>
      </div>
    {/if}
  
</div>

<style>
  button:hover {
    cursor: pointer;
  }

  .chat {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
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

  .narrow {
    right: 65px;
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

  .authoring-tools {
    position: absolute;
    width: 50px;
    right: 5px;
    bottom: 60px;
    padding: 5px;
    font-size: 75%;
  }

  .authoring-tools button {
    margin-bottom: 0px;
    margin-top: 5px;
  }

</style>