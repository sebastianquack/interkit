<script>
  import { onMount } from 'svelte';
  import { getConfig } from '../../shared/util.js';
  import { token, boardCodeChanged } from './stores.js';

  import ResourceAdmin from './ResourceAdmin.svelte';
  import VarList from './VarList.svelte';

  import CodeEditor from './CodeEditor.svelte';

  export let projectId;
  export let close;

  const formats = ["markdown", "handlebars"]

  let projectLibrary = null;
  let projectLibraryInit = null;
  let projectLibraryChanged = false
  
  const loadLibrary = async ()=>{
    const res = await fetch("/api/project/" + projectId);
    const json = await res.json();
    if(json) {
      projectLibrary = json.library
      projectLibraryInit = projectLibrary
    }
  }

  const saveLibrary = async ()=>{
    const res = await fetch("/api/project/" + projectId, {
      method: "PUT",
      headers: {
        'authorization': $token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({_id: projectId, library: projectLibrary})
    });
    projectLibraryInit = projectLibrary;
    projectLibraryChanged = false;
  }

  const revertLibrary = ()=>{
    loadLibrary();
  }

  onMount(async ()=>{
    await loadLibrary();
  });

  $: {
    projectLibraryChanged = projectLibraryInit != projectLibrary
    boardCodeChanged.set(projectLibraryChanged)
  }

  
</script>

<div class="container">

  <ResourceAdmin
    {projectId}
    {close}
    resourceName={"page"}
    defaultValue={{
      menuEntry: "",
      menuOrder: -1,
      key: "",
      format: "markdown",
      content: ""
    }}
  >
    
    <div slot="editForm" let:editEntry={entry} let:update={update}>
      <label>menu entry</label>
      <input value={entry.menuEntry} on:input={e => update(entry, 'menuEntry', e.target.value)}/><br>
      <label>menu order</label>
      <input type=number value={entry.menuOrder} on:input={e => update(entry, 'menuOrder', e.target.value)}/><br>
      <label>key</label>
      <input value={entry.key} on:input={e => update(entry, 'key', e.target.value)}/><br>
      <label>format</label>
      <select on:change={(e) => {console.log(formats[e.target.selectedIndex]); update(entry, 'format', formats[e.target.selectedIndex])}}>
        {#each formats as format}
          <option selected={format == entry.format} value={format}>{format}</option>
        {/each}
      </select>

      
      <label>content</label>
      <CodeEditor language={entry.format} code={entry.content} on:change={(e) => {console.log(e); update(entry, 'content', e.detail.code)}}></CodeEditor><br>

    </div>

    <span slot="listEntry" let:listEntry={entry}>{entry.menuEntry} {entry.menuOrder}</span>

  </ResourceAdmin>


  <h4>project library</h4>
  <CodeEditor bind:code={projectLibrary}></CodeEditor>
  
  <VarList scope="project" ids={{project: projectId}} authoring/>

</div>

{#if projectLibraryChanged} 
  <div class="float-save">
    <button on:click={saveLibrary}>save</button>
    <button on:click={revertLibrary}>revert</button> 
  </div>
{/if}

<style>

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

  .float-save {
    position: absolute;
    right: 10px;
    top: 20px;
  }


</style>
