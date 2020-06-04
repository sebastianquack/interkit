<script>

  export let visible = true;
  export let info = "";//"player not looking at the screen"
  export let onClose = ()=>visible = false;
  /*export let notificationItem = {
    side: "left",
    message: "alert",
    label: "operator",
    params: {},
    attachment: {}
  };*/
  export let notificationItem;
  export let openBoardForMessage;

  import ChatItemBubble from './ChatItemBubble.svelte';

  const notificationTap = ()=>{
    if(notificationItem.board && notificationItem.node) {
      openBoardForMessage(notificationItem.board, notificationItem.node);  
    }
  }
  
</script>

<div id="container" on:click={onClose} style="visibility: {visible ? 'visible' : 'hidden'}">     
  {#if notificationItem} 
    <div id="notification" on:click={notificationTap}>
      <ChatItemBubble item={notificationItem}/>
    </div>
  {/if}
  <div id="info">{info}</div>
</div>

<style>

#container {
  width: 100%; 
  height: 100%;
  position: absolute;
  left: 0;
  top: 0;
  background-color: rgb(0,0,0,0.5);
  padding: 40px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  justify-content: center;
  z-index: 11;
}

#info {
  color: #fff;
  width: 100%;
  position: relative;
  padding: 20px;
  box-sizing: border-box;
  text-align: center;
}

#notification {
  position: absolute;
  top: 10px;
  width: 95%;
  background-color: #fff;
  box-sizing: border-box;
  left: 50%;
  transform: translate(-50%, 0);
  padding: 5px 10px;
  z-index: 12;
}

#notification:hover {
  cursor: pointer;
}

</style>
