<script>

  let w; // the width of the container
  let h; // the height of the container

  let height = 50; // the initial height of the top-right-work-area in vh

  let dragging = false;
  let startDragY;
  let startHeight;
  let areaStyle = {};

  const startDrag = (e)=>{
    //console.log("startDrag");
    dragging = true;
    startDragY = e.clientY; // mouse pos in pixels at start of drag
    startHeight = height; // 
  }

  const drag = (e)=>{
    if(dragging) {
      let diffY = e.clientY - startDragY; // the amount dragged so far in pixels
      height = startHeight + ((diffY / h) * 100);
      //console.log(height);
      updateAreaStyle();
    }
  }

  const endDrag = ()=>{
    dragging = false;
  }

  let orientation = "right";
  const toggleOrientation = () => {
    dragging = false;
    height = 50;
    orientation = orientation == "right" ? "left" : "right";
    updateAreaStyle();
  }

  const updateAreaStyle = () => {
    let userSelect = dragging ? "user-select: none" : "";
    areaStyle["left-top"] = 
      orientation == "left" ? ("height: " + height + "%;" + userSelect) : "height: 100%"; 
    areaStyle["left-bottom"] = 
      orientation == "left" ? ("height: " + (100-height) + "%;" + userSelect) : "height: 0"; 
    areaStyle["top-right"] = 
      orientation == "right" ? ("height: " + (height)+ "%;" + userSelect) : "height: 100%"; 
    areaStyle["bottom-right"] = 
      orientation == "right" ? ("height: " + (100-height)+ "%;" + userSelect) : "height: 0";
    areaStyle = areaStyle;
  }

  updateAreaStyle();
  

</script>


<div class="container" 
  bind:clientWidth={w} 
  bind:clientHeight={h} 
  on:mousemove={drag} 
  on:mouseup={endDrag}>
  
<div id="left" class="area">

  <div class="left-top-menu area">

    <slot name="left-top-menu"></slot>

  </div>

  <div class="left-work-area area">


    <div class="left-top" style={areaStyle["left-top"]}>
      <slot name="left-work-area"></slot>
    </div>

    <div class="left-bottom" style={areaStyle["left-bottom"]}>

      {#if orientation == "left"}
      <div class="horizontal-divider" on:mousedown={startDrag}>
        <span class="orientation-toggle" on:click={toggleOrientation}>{orientation == "right" ? "<" : ">"}</span>
        <slot name="horizontal-divider"></slot>
      </div>

      <slot name="playtest-area"></slot>
      {/if}

    </div>


  </div>

</div>

<div id="top-right" class="area" style={areaStyle["top-right"]}>
      
  <slot name="top-right-work-area"></slot>

</div>

<div id="bottom-right" style={areaStyle["bottom-right"]}>
      
      {#if orientation == "right"}
      <div class="horizontal-divider" on:mousedown={startDrag}>
        <span class="orientation-toggle" on:click={toggleOrientation}>{orientation == "right" ? "<" : ">"}</span>
        <slot name="horizontal-divider"></slot>
      </div>

      <slot name="playtest-area"></slot>
      {/if}

</div>

</div>


<style>

  .container {
    height: 100vh;
    overflow: hidden;
    width: 100%;
    top: 0;
    left: 0;
    position: absolute;
    box-sizing: border-box;
  }

  .area {
    position: absolute;
    box-sizing: border-box;
  }

  #left {
    top: 0;
    left: 0;
    height: 100%;
    width: 50%; 
    z-index: 0;
    border-right: 4px solid gray;
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

  .left-top, .left-bottom {
    height: 50%;
    position: relative;
    box-sizing: border-box;
    overflow-y: scroll;
  }

  .left-top {
    padding: 10px;
  }

  .left-bottom {
    padding-top: 30px;
  }



  #top-right {
    width: 50%;
    overflow-y: auto;    
    top: 0;
    right: 0;
    /*border-left: 4px solid gray;*/
    padding: 10px;
  }

  .horizontal-divider {
    height: 30px;
    width: 100%;
    background-color: #fff; 
    border-top: 2px solid gray;
    border-bottom: 2px solid gray;
    z-index: 200;
    padding: 5px;
    font-size: 80%;
    text-align: right;
    box-sizing: border-box;
    position: absolute;
    top: 0;
  }

  .horizontal-divider:hover {
    cursor: ns-resize;
  }

  .orientation-toggle {
    position: absolute;
    left: 5px;
    color: gray;
  }

  .orientation-toggle:hover {
    cursor: pointer;
  }

  #bottom-right {
    width: 50%;
    position: absolute;
    bottom: 0;
    right: 0;
    /*border-left: 4px solid gray;*/
    box-sizing: border-box;
    padding-top: 30px;
  }



</style>

