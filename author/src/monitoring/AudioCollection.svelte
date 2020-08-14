<script>

import { onMount } from 'svelte'
import { getFilenameForFilekey, getConfig } from '../../../shared/util.js'

export let collection;
export let attachPlayer;

let fileServerURL;

const formatAudioEntry = async (entry) => {
  if(entry && entry.filename) {
    entry.audioSrc = fileServerURL + (await getFilenameForFilekey(entry.filename))
  }
  return entry;
}

let entries = [];
onMount(async ()=>{
  console.log(collection)
  if(collection.entries) {
    fileServerURL = await getConfig("fileServerURL");
    console.log("file", fileServerURL)
    console.log("foo", collection)
    for(let e of collection.entries) {
      let entry = await formatAudioEntry(e)
      console.log(entry)
      entries.push(entry)
    }
    entries = entries;
    console.log(entries)
  }
})

</script>

{#if collection}
  <h4>{collection.key}</h4>
  <ul>
  {#each entries as entry}
    <li>
    {#if entry}
        {entry.label}<br>
        <audio controls>
          <source src={entry.audioSrc} type={"audio/mp3"}>
        </audio><br>
        <small on:click={()=>attachPlayer(entry.playerId)}>{entry.playerId}</small>        
    {:else}            
      not recorded
    {/if}
    </li>
  {/each}
  </ul>
{/if}
