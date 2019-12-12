<script>
  import { beforeUpdate, afterUpdate, onMount, onDestroy } from 'svelte';

  import { joinRoom, leaveRoom, listenForMessages, stopListening, emitMessage } from './socketClient.js';

  export let currentNodeId;

  let div;
  let autoscroll;

  let comments = [];

  onMount(() => {
    joinRoom(currentNodeId);
    listenForMessages((message)=>{
      console.log(message);

      setTimeout(() => {
        comments = comments.concat({
          author: 'eliza',
          text: '...',
          placeholder: true
        });

        setTimeout(() => {
          comments = comments.filter(comment => !comment.placeholder).concat({
            author: 'eliza',
            text: message.message
          });
        }, 500 + Math.random() * 500);
      }, 200 + Math.random() * 200);
    })
  })

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
</script>

<style>
  .chat {
    display: flex;
    flex-direction: column;
    height: 300px;
    max-width: 320px;
  }

  .scrollable {
    flex: 1 1 auto;
    border-top: 1px solid #eee;
    margin: 0 0 0.5em 0;
    overflow-y: auto;
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

  .eliza span {
    background-color: #eee;
    border-radius: 1em 1em 1em 0;
  }

  .user span {
    background-color: #0074D9;
    color: white;
    border-radius: 1em 1em 0 1em;
    word-break: break-all;
  }
</style>

<div class="chat">
  <h2>chat</h2>

  <div class="scrollable" bind:this={div}>
    {#each comments as comment}
      <article class={comment.author}>
        <span>{comment.text}</span>
      </article>
    {/each}
  </div>

  <input on:keydown={handleKeydown}>
</div>