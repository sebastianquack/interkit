<script>
  import { beforeUpdate, afterUpdate, onMount, onDestroy } from 'svelte';

  import { joinRoom, leaveRoom, listenForMessages, stopListening, emitMessage } from './socketClient.js';

  export let authoring;
  export let currentNodeId;
  let nodeIdBackup;

  let journeyNode = null;

  let div;
  let autoscroll;

  let comments = [];

  const init = (nodeId)=> {
    joinRoom(nodeId);
    listenForMessages((message)=>{
      console.log(message);

      if(message.moveTo) {
        journeyNode = message.moveTo;
      }

      if(message.message) {

        setTimeout(() => {
          comments = comments.concat({
            author: 'server',
            text: '...',
            placeholder: true
          });

          setTimeout(() => {
            comments = comments.filter(comment => !comment.placeholder).concat({
              author: 'server',
              text: message.message
            });
          }, 500 + Math.random() * 500);
        }, 200 + Math.random() * 200);

      }
    })    
  }

  $: {
    console.log("currentNodeId changed");
    stopListening();
    if(nodeIdBackup) leaveRoom(nodeIdBackup);
    init(currentNodeId)
    nodeIdBackup = currentNodeId;
  }

  onDestroy(() => {
    leaveRoom(currentNodeId);
    stopListening();
  })

  beforeUpdate(() => {
    autoscroll = div && (div.offsetHeight + div.scrollTop) > (div.scrollHeight - 20);
  });

  afterUpdate(() => {
    if (autoscroll) div.scrollTo(0, div.scrollHeight);
  });

  function handleKeydown(event) {
    if (event.which === 13) {
      const text = event.target.value;
      if (!text) return;

      comments = comments.concat({
        author: 'user',
        text
      });

      event.target.value = '';
      emitMessage(text);
    }
  }

  const reEnter = ()=> {
    leaveRoom(currentNodeId);
    comments = [];
    setTimeout(()=>{
      joinRoom(currentNodeId);  
    }, 50);
  }
</script>

<div class="chat">
  <div class="scrollable" bind:this={div}>
    {#each comments as comment}
      <article class={comment.author}>
        <span>{comment.text}</span>
      </article>
    {/each}
  </div>

  <div class="input-container">
    <input on:keydown={handleKeydown}>
  </div>

</div>

{#if authoring}
  <div class="chat-debug">{journeyNode ? journeyNode.name : ""}</div>
  <button id="re-enter" on:click={reEnter}>re-enter script node</button>
{/if}


<style>
  .chat {
    position: absolute;
    top: 0;
    bottom: 50px;
    left: 0;
    right: 0;
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

  article {
    margin: 0.5em 0;
  }

  .user {
    text-align: right;
  }

  span {
    padding: 0.5em 1em;
    display: inline-block;
  }

  .server span {
    background-color: #eee;
    border-radius: 1em 1em 1em 0;
  }

  .user span {
    background-color: #0074D9;
    color: white;
    border-radius: 1em 1em 0 1em;
    word-break: break-all;
  }

  .input-container {
    width: 100%;
    padding: 5px;
    position: absolute;
    bottom: 0px;
    left: 0px;
    box-sizing: border-box;
  }

  input {
    width: 100%;
  }

  .chat-debug {
    position: absolute;
    bottom: 10px;
    left: 10px;
    font-size: 10px;
  }

  #re-enter {
    position: absolute;
    bottom: 10px;
    right: 10px;
    width: auto;
    margin-bottom: 0px;
  }
</style>