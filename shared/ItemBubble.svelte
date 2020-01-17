<script>
  export let item;
  export let onClick;
</script>


<article class={item.option ? "option" : item.side} on:click={()=>{if(item.option) onClick()}}>
    {#if item.side == "left" && !item.option}<label class="bubble-supertitle">{item.label}</label>{/if}
    <span>
      {item.placeholder ? "..." : (item.message ? item.message : "")}
      {#if item.imgSrc && item.imgLink} 
        <a href={item.imgLink} target="_blank"><img alt="static map of location" src={item.imgSrc}/></a>
      {/if}
      {#if item.imgSrc && !item.imgLink} 
        <img alt="static map of location" src={item.imgSrc}/>
      {/if}
    </span>        
</article>


<style>

article {
  margin: 0.5em 0;
}

.right {
  text-align: right;
}

.system {
  text-align: center;
  margin-left: 25%;
  margin-right: 25%;
  background-color: #efefef;
  border-radius: 3px;
}

.system span {
  width: 100%;
  box-sizing: border-box;
  font-size: 10px;
  color: gray;
}

label {
  display: block;
  font-size: 10px;
  color: gray;
  margin-bottom: 2px;
  margin-top: 2px;
}

span {
  padding: 0.5em 1em;
  display: inline-block;
  user-select: none;
  max-width: 100%;
  word-wrap: break-word;
  box-sizing: border-box;
}

span img {
  width: 100px;
  padding-top: 5px;
}

.left span {
  background-color: #eee;
  border-radius: 1em 1em 1em 0;
}

.right span {
  background-color: #0074D9;
  color: white;
  border-radius: 1em 1em 0 1em;
  word-break: break-all;
}

.option {
  text-align: right;
}

.option span {
  background-color: yellow;
  border-radius: 1em 1em 0 1em;
  word-break: break-all;
}

.option:hover {
  cursor: pointer;
}


</style>