<script>
  export let item = {};
  export let onClick;
</script>

{#if item.params && item.attachment}

  {#if !item.params.optionsArray}

    <article class={item.params.option ? "option" : item.side} on:click={onClick}>
        {#if item.side == "left" && !item.params.option}<label class="bubble-supertitle">{item.label}</label>{/if}
        <span>
          {item.placeholder ? "..." : (item.message ? item.message : "")}
          {#if item.attachment.imgSrc && item.attachment.imgLink} 
            <a href={item.attachment.imgLink} target="_blank"><img alt={item.attachment.alt} src={item.attachment.imgSrc}/></a>
          {/if}
          {#if item.attachment.imgSrc && !item.attachment.imgLink} 
            <img alt={item.attachment.alt} src={item.attachment.imgSrc}/>
          {/if}
          {#if item.attachment.audioSrc} 
             <audio controls autoplay={item.attachment.autoplay ? true : false}>
              <source src={item.attachment.audioSrc} type="audio/mpeg">
            </audio> 
          {/if}
        </span>        
    </article>

  {:else}

      {#each item.params.optionsArray as option, index}
        <article class="optionsArray" on:click={()=>{if(item.params.index == undefined) onClick(index)}}>
          <span class={index == item.params.index ? "selected" : (item.params.index != undefined ? "inactive" : "")}>{option}</span>
        </article>
      {/each}

  {/if}

{/if}


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
  border-radius: 1em 1em 1em 1em;
  word-break: break-all;
  box-shadow: 1px 3px lightgray;
}

.option:hover {
  cursor: pointer;
}

.optionsArray {
  text-align: right;
}

.optionsArray span {
  background-color: yellow;
  border-radius: 1em 1em 1em 1em;
  word-break: break-all;
  box-shadow: 1px 3px lightgray;
}

.optionsArray span.selected {
  background-color: #0074D9;
  color: white;
  box-shadow: none;
}

.optionsArray span.inactive {
  background-color: #eee;
  box-shadow: none; 
}



</style>