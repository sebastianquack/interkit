<script>

import { token } from './stores.js';  

export let scope;
export let ids;

let vars = [];

const loadVars = async ()=>{
    console.log("loading vars for", scope, JSON.stringify(ids));
    let query = {...ids, scope};
    let embed = scope == "playerNode" ? "&$embed=node" : ""
    const res = await fetch("/api/variable?$where=" + JSON.stringify(query) + embed);
    const json = await res.json();
    console.log(json);
    if(json.docs) vars = json.docs;
}  

$: {
  if(scope && ids) loadVars();
}

const updateVar = async (v)=>{

  let input = prompt("new value");
  if(input != null) {

    let newValue = input;

    if(input == "true" || input == "false") {
      newValue = input == "true" ? true : false;
    }

    if(!isNaN(parseFloat(input))) {
      newValue = parseFloat(input);
    }

    console.log(newValue, typeof newValue);
    const res = await fetch("/api/variable/" + v._id + "/valueUpdate", {
      method: "PUT",
      headers: {'authorization': $token},
      body: JSON.stringify({value: newValue})
    });
    if(res.ok) {
      loadVars();
    }
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



</script>

<h4>{scope} variables <button on:click={loadVars}>reload</button></h4> 
<ul>
  {#each vars as v}
  <li>{v.node ? v.node.name ? v.node.name + "/" : "" : ""}{v.key}: {v.value} <button on:click={()=>updateVar(v)}>edit</button> <button on:click={()=>removeVar(v)}>delete</button></li>
  {/each}
</ul>

<style>
  h4 button {
    font-size: 16px;
  }

  h4 {
    margin-bottom: 0px;
  }
</style>



