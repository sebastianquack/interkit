<script>
  import { isIOS } from 'mobile-device-detect';

  import { beforeUpdate, afterUpdate, onMount, onDestroy } from 'svelte';
  import { getConfig, postPlayerMessage, postAdminMessage, getCurrentNodeId, getPlayerVar } from '../../shared/util.js';

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
  //export let setNotificationItem = ()=>{}; 
  export let showLockScreen; 
  export let setLockScreen = ()=>{};
  export let displayAlert;
  export let openChatView; // opens chat view (if in map or archive)
  export let openBoardFromNodeId; // changes currentBoard

  // optional props from authoring system
  export let authoring;
  export let setEditNodeId = ()=>{console.log("setEditNodeId not implemented in stand-alone player")}
  export let updatePlayerNodeId;  
  export let openDebugPanel;

  let currentNode = null; // this is the full object of the current node stored in playerodeId
  let chatItems = []; // these are all the chat chat items currently displayed

  let inputValue;
  let showItemsSince = Date.now();
  let showMoreItems = false;
  let beginningHistory = false;
  let initialLoad = true;

  export let doInitialLoad = true;

  let attachmentMenuOpen = false;
  let div;

  let   autoscroll = true;
  //let   autoscrollLastTimestamp = 0;
  //let   userScrollLastInteractionTimestamp = 0;
  const autoscrollDelayMs = 400;
  //const autoscrollIsDoneAfterMs = 800;
  //const userScrollTimeoutMs = 
  const autoscrollOffsetPx = 40;

  let autoTyping = false;
  let googleMapsAPIKey;
  let fileServerURL;
  let inputFocus = false;

  let messageQueue = []; // queue messages for sequencial processing if many come in fast via socket
  let status = "idle";
  const defaultInputs = {
      text: true,
      attachments: true,
      gps: true,
      image: true,
      audio: true,
      qr: true,
      hideOwnInput: false
  }
  let inputInterface = defaultInputs;

  let inputAsAdmin = false;
  let inputAsAdminLabel = "ADMIN"
    
  // reactive & lifecycle methods

  onMount(async ()=>{
    googleMapsAPIKey = await getConfig("googleMapsAPIKey");
    fileServerURL = await getConfig("fileServerURL");
  })

  let mainViewOld = mainView;
  beforeUpdate(async ()=>{
    if(mainViewOld != mainView) {
      //console.log("mainView changed to ", mainView)
      mainViewOld = mainView
      if(mainView == "chat") {
        let updated = false
        for(let item of chatItems) {
          let marked = await markAsSeen(item);
          //console.log(item, marked)
          if(marked) updated = true;
        }
        if(updated) updateUnseenMessages("beforeUpdate")
      }
    }
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
    initialLoad = true;
    showMoreItems = false;
    beginningHistory = false;
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

    // find where player is now on this board
    /*let response = await fetch("/api/nodeLog?player="+playerId+"&board="+currentBoard._id);
    let lastNode = await response.json();*/

    let lastNodeId = await getCurrentNodeId(playerId, currentBoard)
    console.log("lastNode", lastNodeId);
    if(lastNodeId) {
      nodeId = lastNodeId;
      firstTimeOnBoard = false; // there is history, we have been here before
    }
    
    // make sure this has been loaded when we register the handler
    fileServerURL = await getConfig("fileServerURL");

    // set up socket events
    registerMessageHandler(receiveMessage)
    
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

    // load history - and process any unseen messages in it
    initialLoad = true;
    await loadMoreItems(currentBoard); 
    scrollUp();

    await updateInputInterface();  
  }
  

  // takes in a new message
  const receiveMessage = async (message) => {
    //console.log("chat message received, putting in queue");
      messageQueue.push(message);
      //console.log("messageQueue.length", messageQueue.length);

      if(messageQueue.length == 1) {
        //console.log("start processing queue");
        processQueue();
      } else {
        //console.log("message handler busy, waiting...");
      }
  }

  const processQueue = async () => {
    await handleMessage(messageQueue[0])

    //console.log("messageHandler done, shifting...")
    messageQueue.shift() // remove the message at position 0
    //console.log("messageQueue.length", messageQueue.length)
    if(messageQueue.length >= 1) {
      processQueue();
    } else {
      //console.log("reached end of message queue");
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
    if(!item.params.interfaceOptions) item.params.interfaceOptions = {};

    // message comes from a different board
    if(currentBoard._id != item.board) {
        console.log("warning, message is from a different board")

        if(item.forceOpen) {
          console.log("forceOpen: openening different board, cancelling queue here")
          openBoardFromNodeId(item.node)          
          messageQueue = []; // remove all itmes from queue, board reloads them anyway
          status = "resetting"
        } else {
          await updateUnseenMessages();
        }
        return;
    }

    //if this comes from a different node on the same board, quietly switch to that node
    if(currentBoard._id == message.board && (!currentNode || (currentNode._id != message.node))) {
        console.log("warning, message is from a different node")
        if(message.recipients.includes(playerId)) {
          await setCurrentNode(message.node);
          //setEditNodeId(message.node);    
        } else {
          console.log("message wasn't for me, ignoring");
          return;
        }
    }

    // mark as seen
    if(mainView == "chat") {
      markAsSeen(item)
    }

    /* interface commands */

    // switch player to chat view if forceOpen is set
    if(item.forceOpen && mainView != "chat") {
      openChatView();
    }

    if(item.params.interfaceCommand) {

      if(item.params.interfaceCommand == "inputs") {
        inputInterface = item.params.interfaceOptions;
      }

      // request for geoposition
      if(item.params.interfaceCommand == "request-geoposition") {
        console.log("geoposition requested, responding...")
        if(navigator.geolocation) {
          navigator.geolocation.getCurrentPosition((position)=>{
            let responseItem = {
              attachment: {
                mediatype: "GPS",
                lat: position.coords.latitude, 
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy
              },
              params: {
                interfaceCommand: "request-geoposition-response",
                interfaceOptions: item.params.interfaceOptions
              },
              node: item._id, board: item.board, project: projectId, sender: playerId        
            }
            postPlayerMessage(responseItem)
          })
        }
        return; 
      }

      if(item.params.interfaceCommand == "alert") {
        displayAlert(item.params.interfaceOptions);
      }

      if(item.params.interfaceCommand == "lock") {
        setLockScreen();
      }      
    }

    /* message processing */

    if(item.attachment.mediatype) {
      item.side = "left";
      if(item.attachment.mediatype == "image") {
        item.attachment.imgSrc = fileServerURL + item.attachment.filename;
      }
      if(item.attachment.mediatype == "audio") {
        item.attachment.audioSrc = fileServerURL + item.attachment.filename;
        //item.attachment.autoplay = true;
      }
      chatItems.push(item);
      sortItems();
      console.log(chatItems);  
      scrollUp();
    }

    let isSystemMessage = false;
    if(!item.seen) {
      item.seen = [];
    }

    if(item.message) {

      isSystemMessage = message.system || message.label == "system";
      let showPlaceholder = !(isSystemMessage || item.params.option);

      // push item into displayed chat
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
        }, 2000);
    }

    // show optionsArray
    if(item.params.optionsArray) {
      chatItems.push({...item, 
        side: "left",
        placeholder: false,
      });
      sortItems();
      scrollUp();
    }

    // show additional notification if chat is not open because we're on the map
    if(mainView=="map" || mainView == "archive" || showLockScreen) {
      if(!item.params.interfaceCommand && !item.params.option && !item.forceOpen) {
        //setNotificationItem({...item, side: isSystemMessage ? "system" : "left"});
        //setLockScreen();  
        await updateUnseenMessages();
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

  const markAsSeen = async (item) => {
    if(!item.seen) item.seen = [];
    if(!item._id) {
      console.log("markAsSeen undefined id", item)
      return
    }
    if(item.seen.indexOf(playerId) == -1) {
      //console.log(item)
      item.seen = [playerId];
      await fetch("/api/message/"+item._id+"/markAsSeen/" + playerId, {
          method: "PUT",
          headers: {
            'Content-Type': 'application/json'
          },            
        });
      return true;
    }
    return false;
  }

  const loadMoreItems = async (board = currentBoard) => {
      console.log("loadMoreItems");
      console.log("loading items earlier than", showItemsSince);  

      let limit = 10;

      if(!fileServerURL) fileServerURL = await getConfig("fileServerURL");

      let response = await fetch("/api/message/selectForChat?"
        +"boardId=" + board._id
        +"&playerId=" + playerId
        +"&showItemsSince=" + showItemsSince
        +"&limit=" + limit
      )

      let historyItems = await response.json();
      console.log("history loaded", historyItems.docs);

      if(!initialLoad || doInitialLoad) {
      
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

      } else {
        showMoreItems = true;
      }

      let unseenMessages = [];

      // if this is the very bottom of the chat, still allow options to be shown
      let allowOptions = false
      if(chatItems.length == 0) allowOptions = true;
      
      // go over loaded items from oldest to newest
      // show options only if they are the last ones at bottom - TODO: disable but still show old options!
      for(let i = 0; i < historyItems.docs.length; i++) {
        let item = historyItems.docs[i];
        if(!item.params) item.params = {};

        // sort out unseen ones for processing
        if(!item.seen || item.seen.indexOf(playerId) == -1) {
            unseenMessages.push(item);
        } else {

          // only show items if user user manually pushed button to load more
          if(!initialLoad || doInitialLoad) {

            // ignore optionsArrays with no selection, these are replaced with selected items
            if(!allowOptions && item.params.optionsArray && item.params.index == undefined) continue

            if(!item.params.option // non-options are always allowed
              || (item.params.option && allowOptions) // options if still allowed
              || (item.params.option && item.sender == playerId) // or if player already chose and sent this
              ) {
              let parsedItem = parseItem(item);
              if(parsedItem) chatItems.unshift(parsedItem); // adds item at beginning array
            }

            // turn off options as soon as a non-option non-interface command comes by
            if(!item.params.option && !item.params.interfaceCommand) {
              allowOptions = false
            }

          }

        }
      }
      chatItems = chatItems;

      // process the unseen messages
      unseenMessages.forEach(async (m)=>await receiveMessage(m));

      await updateUnseenMessages();

      if(!beginningHistory && historyItems.docs.filter(i=>!i.params.interfaceCommand).length == 0) {
        loadMoreItems();
      }

      initialLoad = false;
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

    let side = "left"
    if(rawItem.sender == playerId) side = "right"
    if(rawItem.recipients.includes(playerId)) side = "left"
    if(isSystemMessage) side = "system"  
        
    return {
      ...rawItem,
      loaded: true,
      side,
    }
  }

  const sortItems = () => {
    chatItems.sort((a,b)=> {
      let x = a.timestamp - b.timestamp;
      return x == 0 ? a.outputOrder - b.outputOrder : x;
    });
    chatItems = chatItems;
    //console.log("sorted items", chatItems);
  }


  // loads and updates interface state for this board
  const updateInputInterface = async ()=> {

    let interfaceState = await getPlayerVar({playerId, projectId}, "interfaceState")
    console.log("interfaceState", interfaceState);
    if(!interfaceState) interfaceState = {};

    if(interfaceState.inputs) {
      if(interfaceState.inputs[currentBoard._id]) {
        inputInterface = interfaceState.inputs[currentBoard._id]
      }
      else {
        inputInterface = defaultInputs;  
      }
    } else {
      inputInterface = defaultInputs;
    }
  }

  const scrollUp = ()=> {
    if (!autoscroll) return

    const {scrollHeight, scrollTop, clientHeight} = div
    const offset = scrollHeight - scrollTop - clientHeight

    if (offset > autoscrollOffsetPx) return

    //autoscrollLastTimestamp = Date.now()
    setTimeout(()=>{
      if(div)
        div.scrollTo({
          left: 0, 
          top: div.scrollHeight,
          behavior: 'smooth'
        })
    }, autoscrollDelayMs);
  }

  // item is set when user clicks an option
  const submitInput = (item = null, index = undefined)=>{
    console.log("submitInput", item)
    
    // sanitise
    if (!inputValue && !item) return;
    let optionsArray = false
    if(item)
      if(item.params.optionsArray) {
        optionsArray = true;
        //message = item.params.optionsArray[index]
      }
    let message = item ? item.message : inputValue;

    // if this is not an optionsArray, add an extra item to the chat
    if(!optionsArray) {

      if(!inputInterface.hideOwnInput && !inputAsAdmin) {
        chatItems = chatItems.concat({
          side: 'right',
          message,
          attachment: {},
          params: {}
        });
        chatItems = chatItems.filter((i)=>!(i.params && i.params.option));
        scrollUp();
      }
    
    } else {
      // for optionsArrays just mark selected item
      item.params.index = index;
      chatItems = chatItems;
    }

    // prepare submission to server
    if(item) {
      // remove option param for chosen on in individual option - but preserve params.key
      item.params.option = undefined;
    
      // for optionsArray save index of chosen option in array
      if(item.params.optionsArray) {
        item.params.index = index 
        item.params.optionKey = item.params.optionsArray[index].key;
        item.message = item.params.optionsArray[index]
      }

      //if(inputInterface.hideOwnInput) item.params.hideOwnInput = true;
    }

    let params = undefined
    if(!item && inputInterface.hideOwnInput) {
      params = {
        hideOwnInput: true
      }
    }

    // submission
    if(!inputAsAdmin) {
      
      postPlayerMessage({
        sender: playerId, 
        message, 
        node: currentNode._id, 
        board: currentBoard._id, 
        project: projectId,
        params: item ? item.params : params,
      });
      // todo handle submission errors!

    } else {

      postAdminMessage({
        sender: playerId, 
        message, 
        node: currentNode._id, 
        board: currentBoard._id, 
        project: projectId,
        label: inputAsAdminLabel
      });

    }


    // clear input field at bottom of chat
    inputValue = "";
  }

  const handleKeydown = (event)=>{
    if (event.which === 13) {
      submitInput();
    }
  }

  const handleBlur = event => {
    inputFocus = false;
    if (event.target.value != "" && isIOS) {
      submitInput();
    }
  }

  /*
  const handleScroll = event => {
    const now = Date.now()
    if (autoscroll && now - autoscrollLastTimestamp > autoscrollIsDoneAfterMs) {
      // scroll was probably autoscroll
    } else {
      // scroll was probably scroll
      const {scrollHeight, scrollTop, clientHeight} = event.target
      const offset = scrollHeight - scrollTop - clientHeight
    }
  }*/

  function handleFocus() {
    inputFocus = true;
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

  // audio player management - play the next player after one is finished
  let audioPlayers = [];
  const registerAudioPlayer = (audio, autoplayTrigger = null) => {
    if(audio) {
      audioPlayers.push({audio})
      console.log("added audioPlayer", audioPlayers)  
      return audioPlayers.length - 1;
    }
  }
  // plays next audio player
  const onAudioEnded = (index) => {
    console.log("onAudioEnded for index ", index)
    if(index + 1 < audioPlayers.length) {
      audioPlayers[index + 1].audio.play()
    }
  }

</script>

<div class="chat" class:focus="{ inputFocus}">

    <div 
      class="scrollable {authoring? 'narrow' : ''}" 
      class:no-inputs={!inputInterface.attachments && !inputInterface.text} 
      bind:this={div}
      >
      {#if showMoreItems} <button class="load-more" on:click={()=>loadMoreItems()}>load older messages</button> {/if}
      {#if beginningHistory} <!--small class="history-start"></small--> {/if}
      {#each chatItems as item}
        <ChatItemBubble 
          {item}
          {registerAudioPlayer}
          {onAudioEnded}
          onClick={(index = undefined)=>{
            if(item.attachment.mediatype == "GPS") mapClick(item)

            if(item.params.option || item.params.optionsArray) {
              submitInput(item, index);            
            }
          }}
        />
      {/each}
    </div>

    {#if inputAsAdmin || !attachmentMenuOpen && (inputInterface.attachments || inputInterface.text)}
      <div class="input-container">      
        {#if inputInterface.attachments}
          <button style="width: 2em" class="open-attachment" on:click={()=>{attachmentMenuOpen = true}}></button>
        {/if}
        {#if inputInterface.text || inputAsAdmin}
          <input bind:value={inputValue} on:keydown={handleKeydown} on:blur={handleBlur} on:focus={handleFocus} on:click={scrollUp}>
        {/if}
      </div>
    {/if}

    <AttachmentToolbelt
      {playerId}
      {projectId}
      {currentNode}
      {attachmentMenuOpen}
      {inputInterface}
      {inputAsAdmin}
      closeAttachmentMenu={()=>{attachmentMenuOpen = false}}
      {scrollUp}
      {googleMapsAPIKey}
      addItem={(i)=>{if(!inputInterface.hideOwnInput) chatItems = chatItems.concat({...i})}}
      clearInput={()=>inputValue = ""}
    />

    {#if authoring}
      <div class="authoring-tools">
        <div class="chat-debug">node: {currentNode ? currentNode.name : ""}</div>
        <div class="author-buttons">
          <!--button on:click={reEnter}>clear & re-enter</button-->
          <label>adminInput</label>
          <input type=checkbox bind:checked={inputAsAdmin}>
          <input type=text bind:value={inputAsAdminLabel}>
          <button on:click={()=>setEditNodeId(currentNode._id)}>edit code</button>
          <button on:click={collapseMessages}>hide msgs</button>
          <button on:click={openDebugPanel}>debug</button>
        </div>
      </div>
    {/if}
  
</div>

{#if inputFocus}
  <style type="text/scss">
  // TODO: html/body height <-- window.innerHeight
  </style>
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
    bottom: 0;
  }


  .scrollable {
    margin: 0;
    overflow-y: auto;
    position: absolute;
    top: 0;
    bottom: 45px;
    left: 0;
    right: 0;
    padding: 12px 12px 24px 12px;
  }

  .no-inputs {
    bottom: 0px;
  }

  .narrow {
    right: 85px;
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

  .open-attachment {
    background-image: url("/assets/icons/Arrow -_.svg");
    padding-right: 33px;
    border: none;
    outline: none;
    background-repeat: no-repeat;
    background-position: 0 50%;
    background-color: transparent;
    width: 25px;
    height: 25px;
    position: relative;
    top: 5px;
    margin-right: 5px;    
  }

  input {
    flex: auto;
    margin-bottom: 10px;
    border: 1px solid var(--color-dark);
    border-radius: var(--bubble-border-radius);
    font-weight: 300;
    font-size: 17px;
    line-height: 22px;
    padding-left: 12px;
    outline: none;
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
    width: 75px;
    right: 5px;
    bottom: 60px;
    padding: 5px;
    font-size: 75%;
  }

  .authoring-tools input[type=text] {
    width: 50px;
    font-size: 11px;
    padding: 0px;
  }

  .authoring-tools button {
    margin-bottom: 0px;
    margin-top: 5px;
  }

  .author-buttons {
    margin-top: 10px;
  }

  .chat-debug {
    word-break: break-all; 
  }

</style>