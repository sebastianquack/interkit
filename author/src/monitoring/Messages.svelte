<script>
  export let messages
  export let messagesBoardKey
  export let attachPlayer
</script>

{#if messages}
{#if messages.length}
<h4>{messagesBoardKey}</h4>
  <ul>
  {#each messages as entry}
    {#if entry.message && entry.sender}
    <li>
      {entry.message} <small on:click={()=>attachPlayer(entry.sender)}>{entry.sender}</small>
    </li>
    {/if}
  {/each}
  </ul>
{/if}
{/if}