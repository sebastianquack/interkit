<script>
  import { onMount } from 'svelte';
  import { getConfig, upload, deleteFile } from '../../shared/util.js';

  import { token } from './stores.js';

  import CodeEditor from './CodeEditor.svelte';
  import ItemMap from './ItemMap.svelte';

  export let projectId;
  export let playerId;
  export let googleReady;

  let items = [];
  let defaultPos;
  let defaultZoom;
  
  let editItem = null;
  let customType = null;
  let coords = null;
  let itemTypes = ["document", "location"];
  let defaultValue;

  
  const loadItems = async () => {
    let result = await fetch("/api/item?project=" + projectId + "&$embed=players");
    let json = await result.json();
    if(json.docs) {
      items = json.docs;
      //console.log(items);
    }
  }

  onMount(async ()=>{
    loadItems();
    defaultPos = {lat: await getConfig("defaultLat"), lng: await getConfig("defaultLng")};
    console.log(defaultPos);
    defaultValue = {
      name: "name",
      description: "",
      image: null,
      sound: null,
      ...defaultPos
    }
    defaultZoom = await getConfig("defaultZoom");
    //console.log(defaultZoom)
  });

  const createItem = () => {
    editItem = {
      key: "key",
      value: JSON.stringify(defaultValue),
      type: "",
      project: projectId,
      new: true
    }
    coords = defaultPos;
  }

  const setEditItem = (item) => {
    editItem = {...item, 
      type: itemTypes.includes(item.type) ? item.type : "custom", 
      value: JSON.stringify(item.value), 
      updatedAt: undefined, 
      createdAt: undefined}
    if(editItem.type == "custom")
      customType = item.type;
    if(editItem.type == "location")
      coords = {lat: item.value.lat, lng: item.value.lng};
  }

  const updateCoords = (newCoords) => {
    let i = parseItem();          
    i.lat = newCoords.lat();
    i.lng = newCoords.lng();
    editItem.value = JSON.stringify(i);
  }

  const parseItem = () => {
    let valueObj = undefined;
    try {
      valueObj = JSON.parse(editItem.value);
    } catch(e) {
      console.log(e)
    }
    return valueObj;
  }

  const saveItem = async () => {
    if(!editItem.type) {
      alert("no type selected");
      return;
    }
    console.log(editItem);
    const saveItem = {...editItem, 
      type: editItem.type == "custom" ? customType : editItem.type, 
      value: parseItem(), 
      authored: editItem.new,
      new: undefined,
      players: undefined
    };
    
    let response;
    if(editItem.new) {
      response = await fetch("/api/item", {
        method: "POST",
        headers: {
          'authorization': $token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify([saveItem])
      });
      if(response.ok) {
        editItem = null;
        loadItems();
      }
    } else {
      response = await fetch("/api/item/" + editItem._id, {
        method: "PUT",
        headers: {
          'authorization': $token,
          'Content-Type': 'application/json'
        },
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
        headers: {'authorization': $token},
      });
      if(res.ok) {
        loadItems();
      } 
    }
  }

  const award = async (itemId) => {
    
    const res = await fetch("/api/item/"+itemId+"/player/" + playerId, {
        method: "PUT",
        headers: {'authorization': $token, 'Content-Type': 'application/json'},
        body: JSON.stringify({})
    });
    if(res.ok) {
      loadItems();
    }
  }

  const revoke = async (itemId) => {
    const res = await fetch("/api/item/"+itemId+"/player/" + playerId, {
        method: "DELETE",
        headers: {'authorization': $token, 'Content-Type': 'application/json'},
        body: JSON.stringify({})
    });
    if(res.ok) {
      loadItems();
    }
  }

  const awarded = (item) => {
    //console.log(item.players);
    return item.players.filter((p)=>p.player && p.player._id == playerId).length >= 1; 
  }


</script>

<div class="container">

<h3>items</h3>

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
  <CodeEditor bind:code={editItem.value}></CodeEditor>

  {#if editItem.type == "location"}
    <ItemMap 
      {coords}
      zoom={defaultZoom}
      {updateCoords}
      {googleReady} 
      label={parseItem().name}
    />
  {/if}

  <button on:click={saveItem}>save</button>
  <button on:click={()=>editItem = null}>cancel</button>
  
{:else}

  <h4>Project Items</h4>
  <ul>
    {#each items.filter(i => i.authored) as item}
      <li>{item.key} ({item.type}) {awarded(item) ? "(awarded to active)" : ""}
        <button on:click={()=>award(item._id)}>award</button> 
        <button on:click={()=>revoke(item._id)}>revoke</button> 
        <button on:click={()=>setEditItem(item)}>edit</button> 
        <button on:click={()=>deleteItem(item._id)}>delete</button>
      </li>
    {/each}
  </ul>

  <h4>User generated Items</h4>
  <ul>
    {#each items.filter(i => !i.authored) as item}
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


  .container {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    padding-left: 10px;
    padding-right: 10px;
    box-sizing: border-box;
    overflow: scroll;
    width: 100%;
    background-color: #fff;
  }


</style>  