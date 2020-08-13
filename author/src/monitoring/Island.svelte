<script>
  export let item;
  export let attachPlayer;

</script>

{#if item.value && item.value.history}
  <b>{item.value.name}</b> <small>{item.key}</small><br>
    {#if item.value.monument}
   monument: {item.value.monument.description} aus {item.value.monument.components} von {item.value.monument.builder}
   {/if}
    <br>history:
    <ul>
     {#each item.value.history as entry}
        <li>
          {entry.text}
          {#if entry.playerId}
            <button on:click={()=>attachPlayer(entry.playerId)}>attach</button>        
          {/if}
        </li>
     {/each}
   </ul>
   <br>
{/if}
    