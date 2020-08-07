<script>
  import { onMount } from 'svelte';
  import { token } from './stores.js';

  export let projectId;
  export let resourceName;
  export let defaultValue;
  export let sortAttribute;
  
  let loading = true;
  let entries = [];
  let editEntry = null;

  let changed = false;
  
  const loadEntries = async () => {
    let result = await fetch(`/api/${resourceName}?project=` + projectId 
      + (sortAttribute ? ("&$sort=" + sortAttribute) : "")
    );
    let json = await result.json();
    if(json.docs) {       
      entries = json.docs;
    }
  }

  onMount( async ()=>{
    await loadEntries()
    loading = false
  });

  const createEntry = () => {
    editEntry = {...defaultValue, new: true}
  }

  const saveEntry = async () => {
    let saveEntry = {...editEntry, 
      project: projectId
    };

    Object.keys(saveEntry).forEach(key=>{
      if(!(key in defaultValue || key == "project")) saveEntry[key] = undefined;
    })
    
    let response;
    if(editEntry.new) {
      response = await fetch(`/api/${resourceName}`, {
        method: "POST",
        headers: {
          'authorization': $token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([saveEntry])
      });
      if(response.ok) {
        editEntry = null;
        loadEntries();
      }
    } else {
      response = await fetch(`/api/${resourceName}/` + editEntry._id, {
        method: "PUT",
        headers: {
          'authorization': $token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(saveEntry)
      });
    }
    if(response.ok) {
      //editEntry = null;
      changed = false;
      //loadEntries();
    }
  }

  const deleteEntry = async (id) => {
    if(confirm(`permanently remove ${resourceName}?`)) {
      const res = await fetch(`/api/${resourceName}/` + id, {
        method: "DELETE",
        headers: {'authorization': $token},
      });
      if(res.ok) {
        loadEntries();
      } 
    }
  }

  // this is needed because sadly svelte cannot bind to a slot prop
  const update = (item, prop, value) => {
    editEntry[prop] = value;
    editEntry = editEntry; // force an update
    changed = true;
  }

</script>

{#if loading }
  <p> Loading ... </p>
{:else}

  <h3>{resourceName}s</h3>

  {#if editEntry}
    <slot name="editForm" editEntry={editEntry} {update}></slot>

    {#if changed}<button on:click={saveEntry}>save</button>{/if}
    <button on:click={()=>editEntry = null}>close</button>
  {:else}

  <ul>
    {#each entries as entry}
      <li>
        <slot name="listEntry" listEntry={entry}></slot>
        <span class="link" on:click={()=>editEntry=entry}>edit</span>
        <span class="link" on:click={()=>deleteEntry(entry._id)}>delete</span>
      </li>
    {/each}
  </ul>

  <button on:click={createEntry}>new entry</button>

  {/if}
{/if}




<style>


  span.link {
    color: rgb(0,100,200);
    text-decoration: none;
  }
  span.link:hover {
    cursor: pointer;
    text-decoration: underline;
  }

</style>  