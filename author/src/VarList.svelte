<script>

import { token } from './stores.js';  
import CodeEditor from './CodeEditor.svelte';

export let scope;
export let ids;
export let authoring = true;

let vars = [];

const loadVars = async ()=>{
    console.log("loading vars for", scope, JSON.stringify(ids));
    let query = {...ids, varScope: scope};
    let embed = scope == "playerNode" ? "&$embed=node" : ""
    const res = await fetch("/api/variable?$where=" + JSON.stringify(query) + embed);
    const json = await res.json();
    //console.log(json);
    if(json.docs) vars = json.docs;
}  

$: {
  if(scope && ids) loadVars();
}

const defaultVar = {
  varType: "string",
  value: "",
  varScope: scope,
  new: true
}

let editVar = null;

const createVar = () => {
  editVar = {...defaultVar}
}

const setupEditVar = (v) => {
  let value = v.varType == "object" || v.varType == "number" ? JSON.stringify(v.value) : v.value;
  if(v.stringValue) value = v.stringValue 
  editVar = {...v, value}
}

const parseValue = () => {
    let valueObj = undefined;
    try {
      valueObj = JSON.parse(editVar.value);
    } catch(e) {
      console.log(e)
    }
    return valueObj;
  }

const updateVar = async () => {

  let saveItem = {...editVar, ...ids, createdAt: undefined, updatedAt: undefined, new: undefined};

  saveItem.stringValue = editVar.value; // save the string version for formatting
  
  if(saveItem.varType == "number") {
    saveItem.value = parseFloat(editVar.value);
  }
  if(saveItem.varType == "object") {
    saveItem.value = parseValue()
  }

  console.log(typeof saveItem.value)

  let res;

  if(editVar.new) {

     res = await fetch("/api/variable", {
      method: "POST",
      headers: {
        'authorization': $token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify([saveItem])
    });

  } else {

    res = await fetch("/api/variable/" + editVar._id, {
      method: "PUT",
      headers: {
        'authorization': $token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(saveItem)
    });

  }
  if(res.ok) {
    loadVars();
    editVar = null;
  }
}
   
const removeVar = async (v)=> {
  if(confirm("permanently remove variable?")) {
    const res = await fetch("/api/variable/" + v._id, {
      method: "DELETE",
      headers: {'authorization': $token}
    });
    if(res.ok) {
      loadVars();
    } 
  }
}

const types = ["number", "string", "object"]



</script>

<h4>{scope} variables <button on:click={loadVars}>reload</button> <button on:click={createVar}>create</button></h4> 

{#if editVar}

  <label>key</label>
  <input bind:value={editVar.key}/>
  <label>value</label>
  <CodeEditor bind:code={editVar.value}></CodeEditor>

  <br>

  <select bind:value={editVar.varType}>
    {#each types as type}
    <option value={type}>{type}</option>
    {/each}
  </select>

  <br>

  <button on:click={updateVar}>save</button>
  <button on:click={()=>editVar = null}>cancel</button>

{:else}
  <ul>
    {#each vars as v}
    <li>{v.node ? v.node.name ? v.node.name + "/" : "" : ""}{v.key}: {v.value} 
      {#if authoring}
        <button on:click={()=>setupEditVar(v)}>edit</button> <button on:click={()=>removeVar(v)}>delete</button>
      {/if}
    </li>
    {/each}
  </ul>
{/if}

<style>
  h4 button {
    font-size: 16px;
  }

  h4 {
    margin-bottom: 0px;
  }

  
</style>



