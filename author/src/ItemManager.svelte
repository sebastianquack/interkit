<script>
  import { onMount } from 'svelte';
  import { getConfig, upload, deleteFile } from '../../shared/util.js';

  import { token } from './stores.js';

  import CodeEditor from './CodeEditor.svelte';

  export let projectId;
  export let close;
  export let playerId;

  let items = [];
  
  const loadItems = async () => {
    let result = await fetch("/api/item?project=" + projectId + "&$embed=players");
    let json = await result.json();
    if(json.docs) {
      items = json.docs;
      console.log(items);
    }
  }

  let editItem = null;
  let customType = null;
  let itemTypes = ["document", "location"]

  const defaultValue = {
      description: "",
      image: null,
      sound: null,
      lat: null,
      lng: null
  }

  const createItem = () => {
    editItem = {
      key: "",
      value: JSON.stringify(defaultValue),
      type: "",
      project: projectId,
      new: true
    }
  }

  const setEditItem = (item) => {
    editItem = {...item, 
      type: itemTypes.includes(item.type) ? item.type : "custom", 
      value: JSON.stringify(item.value), 
      updatedAt: undefined, 
      createdAt: undefined}
    if(editItem.type == "custom")
      customType = item.type;
  }

  const saveItem = async () => {
    console.log(editItem);
    let valueObj = {};
    try {
      valueObj = JSON.parse(editItem.value);
    } catch(e) {
      console.log(e)
    }
    let saveItem = {...editItem, 
      type: editItem.type == "custom" ? customType : editItem.type, 
      value: valueObj, 
      new: undefined,
      players: undefined
    };
    
    let response;
    if(editItem.new) {
      response = await fetch("/api/item", {
        method: "POST",
        headers: {'authorization': $token},
        body: JSON.stringify([saveItem])
      });
      if(response.ok) {
        editItem = null;
        loadItems();
      }
    } else {
      response = await fetch("/api/item/" + editItem._id, {
        method: "PUT",
        headers: {'authorization': $token},
        body: JSON.stringify(saveItem)
      });
    }
    if(response.ok) {
      editItem = null;
      loadItems();
    }
  }

  const deleteItem = async (id) => {
    if(confirm("permanently remove item?")) {
      const res = await fetch("/api/item/" + id, {
        method: "DELETE",
        headers: {'authorization': $token}
      });
      if(res.ok) {
        loadItems();
      } 
    }
  }

  const award = async (itemId) => {
    const res = await fetch("/api/player/"+playerId+"/item/" + itemId, {
        method: "PUT",
        headers: {'authorization': $token},
        body: JSON.stringify({_id: itemId})
    });
    if(res.ok) {
      loadItems();
    }
  }

  const revoke = async (itemId) => {
    const res = await fetch("/api/player/"+playerId+"/item/" + itemId, {
        method: "DELETE",
        headers: {'authorization': $token},
        body: JSON.stringify({_id: itemId})
    });
    if(res.ok) {
      loadItems();
    }
  }

  const awarded = (item) => {
    console.log(item.players);
    return item.players.filter((p)=>p.player && p.player._id == playerId).length >= 1; 
  }


  onMount(loadItems);

</script>

<div class="container">

<h3>items<button on:click={close}>close</button></h3>

{#if editItem}
  
  <label>key</label><input bind:value={editItem.key} type="text"/><br>
  
  <select bind:value={editItem.type}>
      <option value={null}>select a type</option>
      <option disabled>_________</option>
      {#each itemTypes as type}
        <option value={type}>{type}</option>
      {/each}
      <option value={"custom"}>custom</option>
  </select>

  {#if editItem.type == "custom"}
    <label>custom type</label><input bind:value={customType} type="text"/>
  {/if}
    
  <br>
  <label>value</label><br>
  <CodeEditor bind:code={editItem.value}></CodeEditor><br>

  <button on:click={saveItem}>save</button>
  <button on:click={()=>editItem = null}>cancel</button>
  
{:else}
  <ul>
    {#each items as item}
      <li>{item.key} ({item.type}) {awarded(item) ? "(awarded to active)" : ""}
        <button on:click={()=>award(item._id)}>award</button> 
        <button on:click={()=>revoke(item._id)}>revoke</button> 
        <button on:click={()=>setEditItem(item)}>edit</button> 
        <button on:click={()=>deleteItem(item._id)}>delete</button>
      </li>
    {/each}
  </ul>

<button on:click={createItem}>new item</button>
{/if}


</div>



<style>

  label {
    display: inline-block;
    margin-right: 5px;
  }

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


</style>  