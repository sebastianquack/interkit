<script>

  import { onMount } from 'svelte';

  import Login from './Login.svelte';
  import Logout from './Logout.svelte';
  import {token} from './stores.js';

  import Project from './Project.svelte';
  import { getConfig } from '../../shared/util.js';

  let currentProject = null;
  let editProject = null;
  let projects = [];

  let playerURL;
  
  const loadProjectList = async ()=>{
    const res = await fetch("/api/project");
    const json = await res.json();
    projects = json.docs;
    playerURL = await getConfig("playerURL");
  }

  const addProject = async ()=>{
    editProject = {
      name: "untitled",
      new: true
    }
  }

  const saveProject = async ()=>{
    if(editProject.new) {
      await fetch("/api/project", {
        method: "POST",
        headers: {'authorization': $token},
        body: JSON.stringify([{
          name: editProject.name,
        }])
      });
    } else {
      await fetch("/api/project/" + editProject._id, {
        method: "PUT",
        headers: {'authorization': $token},
        body: JSON.stringify({
          _id: editProject._id,
          name: editProject.name,
        })
      });
    }
    loadProjectList();
    editProject = null;
  }

  onMount(loadProjectList);

</script>


{#if $token}

  {#if currentProject}

    <button class="top" on:click={()=>currentProject=null}>close {currentProject.name}</button>
    <Project
      projectId={currentProject._id}
    />

  {:else}

    {#if !editProject}

      <Logout/>
    
      <h3>Projects</h3>
      <ul>
      {#each projects as project}
        <li>
          <span on:click={()=>{currentProject = project}}
          >{project.name}</span>
          <button on:click={()=>{editProject = project;}}>✎</button>
          <a target="_blank" href="{playerURL}?project={project._id}">external player link</a>
      {/each}
      </ul>

      <button on:click={addProject}>new</button>

    {:else}

      <input type="text" bind:value={editProject.name}/>
      <button on:click={saveProject}>save</button>
      <button on:click={()=>{editProject = null}}>cancel</button>

    {/if}

  {/if}

{:else}

  <Login/>

{/if}




<style>
  span:hover {
    cursor: pointer;
  }

  a {
    color: gray;
    padding-left: 1px;
    margin-bottom: 10px;
    position: relative;
    font-size: 10px;
    font-weight: normal;
  }

  button.top {
    position: absolute;
    z-index: 10;
  }
</style>