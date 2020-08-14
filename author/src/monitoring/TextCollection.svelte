<script>

import { onMount } from "svelte"

export let collection;
export let attachPlayer;

const formatTextEntry = async (entry) => {
  if(typeof entry == "string") {
    return {text: entry}
  }

  try {
    if(entry.input) {
      return {
        text: entry.input.message ? entry.input.message : "",
        audioSrc: entry.input.attachment.mediatype == "audio" ? entry.input.attachment.audioSrc : undefined,
        playerId: entry.input.msgData.sender
      }
    }
  } catch(e) {
    console.log(e)
    return {text: JSON.stringify(entry)}
  }
}

let entries = []

onMount(async ()=>{
  console.log("foo", collection)
  if(collection.entries) {
    for(let e of collection.entries) {
      let entry = await formatTextEntry(e)
      console.log(entry)
      entries.push(entry)
    }
    entries = entries;
    console.log(entries)
  }
})

</script>

<h4>{collection.key}</h4>

<ul>
{#each entries as entry}
  <li>
    {entry.text}
    {#if entry.audioSrc}
    <audio controls>
        <source src={encodeURI(entry.audioSrc)} type={"audio/mp3"}>
      </audio> 
    {/if}
    {#if entry.playerId}
      <small on:click={()=>attachPlayer(entry.playerId)}>{entry.playerId}</small>
    {/if}

  </li>
{/each}
</ul>
        