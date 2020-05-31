<script>

  const refs = {};
  let w; // the width of the container
  let h; // the height of the container

  let height = 60; // the initial height of the top-right-work-area in vh

  let dragging = false;
  let startDragY;
  let startHeight;
  
  const startDrag = (e)=>{
    dragging = true;
    startDragY = e.clientY; // mouse pos in pixels at start of drag
    startHeight = height; // 
  }

  const drag = (e)=>{
    if(dragging) {
      let diffY = e.clientY - startDragY; // the amount dragged so far in pixels
      height = startHeight + ((diffY / h) * 100);
    }
  }

  const endDrag = ()=>{
    dragging = false;
  }

</script>


<div class="container" 
  bind:this={refs.container} 
  bind:clientWidth={w} 
  bind:clientHeight={h} 
  on:mousemove={drag} 
  on:mouseup={endDrag}>
  
<div id="left" class="area">

  <div class="left-top-menu area">

    <slot name="left-top-menu"></slot>

  </div>

  <div class="left-work-area area">

    <slot name="left-work-area"></slot>

  </div>

</div>

<div id="top-right" class="area" style="height: {height}vh; {dragging ? 'user-select: none' : ''}">

  <slot name="top-right-work-area"></slot>

  <div class="horizontal-divider" 
    on:mousedown={startDrag}
  ></div>

</div>

<div id="bottom-right" class="area" style="height: {100 - height}vh; {dragging ? 'user-select: none' : ''}">

  <slot name="bottom-right-work-area"></slot>

</div>

</div>


<style>

  .container {
    height: 100%;
    width: 100%;
    top: 0;
    left: 0;
    position: absolute;
    box-sizing: border-box;
  }

  .area {
    position: absolute;
    padding: 10px;
    box-sizing: border-box;
  }

  #left {
    top: 0;
    left: 0;
    height: 100vh;
    width: 50%; 
    z-index: 0;
  }

  .left-top-menu {
    top: 0px;
    left: 0px;
    background-color: #fff;
    width: 100%;
    text-align: right;
    padding: 10px 10px 0px 10px;
    z-index: 10;
    border-bottom: 4px solid gray;
  }

  .left-work-area {
    left: 0;
    top: 50px;
    bottom: 0;
    width: 100%;
  }

  #top-right {
    width: 50%;
    overflow-y: auto;    
    top: 0;
    right: 0;
    border-left: 4px solid gray;
  }

  .horizontal-divider {
    position: absolute;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 4px;
    background-color: gray;
    z-index: 200;
  }

  .horizontal-divider:hover {
    cursor: ns-resize;
  }

  #bottom-right {
    width: 50%;
    bottom: 0;
    right: 0;
    border-left: 4px solid gray;
  }

</style>

