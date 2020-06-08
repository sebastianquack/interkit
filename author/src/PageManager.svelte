<script>
  import { onMount } from 'svelte';
  import { getConfig } from '../../shared/util.js';
  import { token } from './stores.js';

  import ResourceAdmin from './ResourceAdmin.svelte';
  import VarList from './VarList.svelte';

  export let projectId;
  export let close;
  
</script>

<div class="container">

  <ResourceAdmin
    {projectId}
    {close}
    resourceName={"page"}
    defaultValue={{
      menuEntry: "",
      menuOrder: -1,
      content: ""
    }}
  >
    
    <div slot="editForm" let:editEntry={entry} let:update={update}>
      <label>menu entry</label>
      <input value={entry.menuEntry} on:input={e => update(entry, 'menuEntry', e.target.value)}/><br>
      <label>menu order</label>
      <input type=number value={entry.menuOrder} on:input={e => update(entry, 'menuOrder', e.target.value)}/><br>
      <label>content</label>
      <textarea value={entry.content} on:input={e => update(entry, 'content', e.target.value)}></textarea>
    </div>

    <span slot="listEntry" let:listEntry={entry}>{entry.menuEntry} {entry.menuOrder}</span>

  </ResourceAdmin>

  <VarList scope="project" ids={{project: projectId}}/>

</div>

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

</style>
