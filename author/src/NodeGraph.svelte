
<script>
  import { token } from './stores.js';  
  
  export let nodes = [];
  export let setEditNodeId;

  const saveNodePosition = async (id, x, y)=> {
    await fetch("/api/scriptNode/" + id, {
          method: 'PUT',
          headers: {'authorization': $token},
          body: JSON.stringify({posX: x, posY: y})
        })    
  }  

  const getNodeIndexById = (id)=> {
    for(let i = 0; i < nodes.length; i++) {
      if(nodes[i]._id == id) return i;
    }
    return -1;
  }

  let mouseX;
  let mouseY;
  let offsetX;
  let offsetY;
  let rectWidth = 100;
  let rectHeight = 66;
  let dragging = null;
  let dragStart;

  let connections = [];
  $: {
    connections = [];
    if(nodes) {
      for(let j = 0; j < nodes.length; j++) {

        let fromX = nodes[j].posX + rectWidth / 2;
        let fromY = nodes[j].posY + rectHeight / 2;
        nodes[j].connectionIds.forEach((id)=>{
          let i = getNodeIndexById(id);
          if(i > -1) {
            let to = nodes[i];
            let toX = to.posX + rectWidth / 2;
            let toY = to.posY + rectHeight / 2;
            let dx = toX - fromX;
            let dy = toY - fromY;
            let l = Math.sqrt((dx * dx) + (dy * dy));
            let shorter = 1.0 - (70.0/l);
            let toXs = fromX + dx * shorter;
            let toYs = fromY + dy * shorter;
            connections.push({
              fromX,
              fromY,
              toX: toXs,
              toY: toYs
            })
          }
        });
      }
    } else {
      nodes = [];
    }
  }

  
</script>

 <svg
  on:mousemove={(e)=>{
    mouseX = e.clientX;
    mouseY = e.clientY;         
    // update dragging node
    if(dragging) {
      let i = getNodeIndexById(dragging);
      if(i > -1) {
        nodes[i].posX = mouseX - offsetX;
        nodes[i].posY = mouseY - offsetY;  
      }
    }
  }}
  on:mouseup={()=>{
    let i = getNodeIndexById(dragging);
    if(i > -1) {
      saveNodePosition(nodes[i]._id, nodes[i].posX, nodes[i].posY)
    }
    dragging = null;  
  }}
 >
  
  <defs>
    <marker id="arrowhead" markerWidth="10" markerHeight="7" 
          refX="0" refY="3.5" orient="auto">
      <polygon points="0 0, 10 3.5, 0 7" />
    </marker>
  </defs>
      
  {#each connections as connection}
      <line 
        x1={connection.fromX} 
        y1={connection.fromY} 
        x2={connection.toX} 
        y2={connection.toY}
        marker-end="url(#arrowhead)"
      />
  {/each}

  {#each nodes as node, index}
      <g
        on:mousedown={()=>{
            console.log("mousedown", node._id);
            dragging = node._id;
            dragStart = Date.now();
            offsetX = mouseX - node.posX;
            offsetY = mouseY - node.posY;
          }}
        on:click={()=>{
            if(Date.now() - dragStart < 250)
              setEditNodeId(node._id)
          }}
      >
        <rect
          x={node.posX}
          y={node.posY}
          width={rectWidth}
          height={rectHeight}
        />
        <text 
          class="script-node"
          x={node.posX+10}
          y={node.posY+20}
        >
          {node.name}
        </text>
      </g>

      />
  {/each}  
  
</svg>


<style>

line {
  stroke:black;
  stroke-width:1;
}

svg {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  z-index: 0;
}

rect {
    fill: #efe9d0;
    stroke:black;
    stroke-width:1;
  }


.script-node {
    fill: black;
    user-select: none;
    z-index: 1;
  }

g:hover {
  cursor: pointer;
}

</style>