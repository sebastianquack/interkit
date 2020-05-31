<script>

  import { onMount } from 'svelte';

  import ProjectWorkspace from './ProjectWorkspace.svelte';
  import { getConfig } from '../../shared/util.js';
  import {token, userId, loggedInUsername} from './stores.js';
  import Logout from './Logout.svelte';

  let currentProject = null;
  let editProject = null;
  let projects = [];

  let playerURL;
  let newEditor = "";
  
  const loadProjectList = async ()=>{
    if(!$userId) return;

    //admin sees all:
    if($loggedInUsername == "admin") {
      const res = await fetch("/api/project?$embed=users", {
        method: "GET",
        headers: {'authorization': $token},
      });
      const json = await res.json();
      console.log(json);
      if(json.docs) {
        projects = json.docs;
      } else {
        projects = [];
      }
     
    } else {
      const res = await fetch("/api/user/" + $userId + "/project?$embed=users", {
        method: "GET",
        headers: {'authorization': $token},
      });
      const json = await res.json();
      console.log(json);
      if(json.docs) {
        projects = json.docs;
      } else {
        projects = [];
      }
    }
    
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
      let response = await fetch("/api/project", {
        method: "POST",
        headers: {'authorization': $token},
        body: JSON.stringify([{
          name: editProject.name,
        }])
      });

      // add user to project editors
      const json = await response.json();
      console.log(json);
      if(json.length) {
        let projectId = json[0]._id;
        await fetch("/api/project/" + projectId + "/user/" + $userId, {
          method: "PUT",
          headers: {'authorization': $token},
          body: JSON.stringify({})
        });
      }
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

  const addEditor = async ()=> {
    console.log(newEditor);

    // get user id
    const res = await fetch("/api/user?username=" + newEditor, {
      headers: {'authorization': $token},
    });
    let json = await res.json();
    
    if(json.docs.length) {
      let newUserId = json.docs[0]._id;
    
      // add user to project
      let res2 = await fetch("/api/project/" + editProject._id + "/user/" + newUserId, {
            method: "PUT",
            headers: {'authorization': $token},
            body: JSON.stringify({})
          });
      editProject.users.push({
        user: json.docs[0]
      })
      editProject = editProject;
      newEditor = "";
      await loadProjectList();
    } else {
      alert("user not found");
    }
    
  }

  const removeEditor = async (id)=> {
      // remove user from project
      if(confirm("remove editor from this project?")) {
        let res = await fetch("/api/project/" + editProject._id + "/user/" + id, {
              method: "DELETE",
              headers: {'authorization': $token},
              body: JSON.stringify({})
            });
        editProject.users = editProject.users.filter(u => u.user._id != id);
        await loadProjectList();
      }
  }

  onMount(loadProjectList);

</script>


{#if currentProject}

  <ProjectWorkspace
    project={currentProject}
    close={()=>currentProject = null}
  />

{:else}

  {#if !editProject}

    <Logout/>
  
      {#if projects}
        <h1>Projects</h1>
        <ul>
        {#each projects as project}
          <li>
            {project.name}
            <button on:click={()=>{editProject = project;}}>✎</button>
            <button on:click={()=>{currentProject = project;}}>open project</button>
            <a target="_blank" href="{playerURL}?project={project._id}">external player link</a>
        {/each}
        </ul>
      {/if}
      

    <button on:click={addProject}>new</button>

  {:else}

    <button on:click={()=>{editProject = null}}>back</button>

    <h3>project name</h3>
    <input type="text" bind:value={editProject.name}/>
    <button on:click={saveProject}>save</button>

    {#if editProject.users}
      <h3>project editors</h3>
      {#each editProject.users as user}
        <ul>
          <li>{user.user.username} <span on:click={()=>{removeEditor(user.user._id)}}>x</span></li>
        </ul>
      {/each}
      <input type="text" bind:value={newEditor}/>
      <button on:click={addEditor}>add editor</button>
    {/if}
    

  {/if}

{/if}


<style>
  span:hover {
    cursor: pointer;
  }

  a, span {
    color: gray;
    padding-left: 1px;
    margin-bottom: 10px;
    position: relative;
    font-size: 10px;
    font-weight: normal;
  }
</style>