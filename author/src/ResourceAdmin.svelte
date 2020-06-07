<script>
  import { onMount } from 'svelte';
  import { token } from './stores.js';

  export let projectId;
  export let close;
  export let resourceName;
  export let defaultValue;
  
  let loading = true;
  let entries = [];
  let editEntry = null;
  
  const loadEntries = async () => {
    let result = await fetch(`api/${resourceName}?project=` + projectId);
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
      new: undefined,
      createdAt: undefined,
      project: projectId
    };
    
    let response;
    if(editEntry.new) {
      response = await fetch(`/api/${resourceName}`, {
        method: "POST",
        headers: {'authorization': $token},
        body: JSON.stringify([saveEntry])
      });
      if(response.ok) {
        editEntry = null;
        loadEntries();
      }
    } else {
      response = await fetch(`/api/${resourceName}/` + editEntry._id, {
        method: "PUT",
        headers: {'authorization': $token},
        body: JSON.stringify(saveEntry)
      });
    }
    if(response.ok) {
      editEntry = null;
      loadEntries();
    }
  }

  const deleteEntry = async (id) => {
    if(confirm(`permanently remove ${resourceName}?`)) {
      const res = await fetch(`api/${resourceName}/` + id, {
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
  }

</script>

<div class="container">

<h3>{resourceName}<button on:click={close}>close</button></h3>

{#if loading }
  <p> Loading ... </p>
{:else}

  {#if editEntry}
    <slot name="editForm" editEntry={editEntry} {update}></slot>

    <button on:click={saveEntry}>save</button>
    <button on:click={()=>editEntry = null}>cancel</button>
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


</div>



<style>

  h3 button {
    margin-left: 5px;
    font-size: 16px;
  }

  .container {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    padding-left: 10px;
    box-sizing: border-box;
    overflow: scroll;
    width: 100%;
    background-color: #fff;
  }

  span.link {
    color: rgb(0,100,200);
    text-decoration: none;
  }
  span.link:hover {
    cursor: pointer;
    text-decoration: underline;
  }

</style>  