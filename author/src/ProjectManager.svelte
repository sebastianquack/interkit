<svelte:head>
  <script src="https://maps.googleapis.com/maps/api/js?libraries=geometry&key=AIzaSyDQLtgFdKIsghQkoiYN-ojaa2wX7K4d630&callback=googleReady"></script>
</svelte:head>

<script>

  import { onMount } from 'svelte';
  import { push, replace } from 'svelte-spa-router';

  import ProjectWorkspace from './ProjectWorkspace.svelte';
  import { getConfig } from '../../shared/util.js';
  import {token, userId, loggedInUsername} from './stores.js';
  import Logout from './Logout.svelte';

  export let params = {}

  let currentProject = null;
  let editProject = null;
  let projects = [];
  let loading = true;

  let playerURL;
  let newEditor = "";
  let uploadProgress = null;

  let googleReady = false;

  window.googleReady = ()=>{
    console.log("googleReady");
    googleReady = true;
  }
  
  const loadProjectList = async ()=>{
    if(!$userId) return;

    //admin sees all:
    if($loggedInUsername == "admin") {
      const res = await fetch("/api/project?$embed=users", {
        method: "GET",
        headers: {'authorization': $token},
      });
      const json = await res.json();
      //console.log(json);
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
        headers: {
          'authorization': $token,
          'Content-Type': 'application/json'
        },
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
        headers: {
          'authorization': $token,
          'Content-Type': 'application/json'
        },
          body: JSON.stringify({})
        });
      }
    } else {
      await fetch("/api/project/" + editProject._id, {
        method: "PUT",
        headers: {
          'authorization': $token,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          _id: editProject._id,
          name: editProject.name,
        })
      });
    }
    loadProjectList();
    editProject = null;
  }

  const deleteProject = async ()=>{
    if(confirm("really?")) {
      await fetch("/api/project/" + editProject._id, {
        method: "DELETE",
        headers: {'authorization': $token},
      });
      loadProjectList();
      editProject = null;
    }
  }

  const duplicateProject = async event => {
    const res = await fetch("/api/project/?projectId=" + editProject._id, {
      method: "POST",
      headers: {'authorization': $token},
    });
  }

  const exportProject = async event => {
    // trigger export and get download url and filename
    const res = await fetch("/api/export?projectId=" + editProject._id, {
      headers: {'authorization': $token},
    });
    const {downloadUrl, filename} =  await res.json();
    // create dummy <a> to trigger download
    const elem = event.target
    const child = document.createElement('a')
    child.textContent = "download"
    child.style.display = 'none'
    elem.parentNode.appendChild(child)
    child.setAttribute('href', downloadUrl);
    child.setAttribute('download', filename);
    child.click()
  }
    
  const handleFilesSubmit = async event => {
    event.preventDefault();
    const file = event.target.files[0]
    console.log(file)

    var xhr = new XMLHttpRequest(); 
    xhr.onload = (evt) => {
      event.target.value = null;
      uploadProgress = null
      loadProjectList(); 
    }
    xhr.onprogress = (evt) => {
      uploadProgress = 100 * evt.loaded / evt.total
    }
    xhr.onerror = function () {
      alert("import error. sorry.")
    }

    const res = await fetch("/api/uploadToken", {
      headers: {'authorization': $token},
    });
    let json = await res.json();
    const uploadToken = json.uploadToken;
    // generate download url
    var url = "/api/export?uploadToken=" + uploadToken

    xhr.open('PUT', url, true);
    uploadProgress = 0
    xhr.send(file); 
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
            headers: {'authorization': $token, 'Content-Type': 'application/json'},
            body: JSON.stringify({}),
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
              headers: {
                'authorization': $token,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({})
            });
        editProject.users = editProject.users.filter(u => u.user._id != id);
        await loadProjectList();
      }
  }

  onMount(async () => {
    await loadProjectList(); 
    loading = false;
  });

  $: {
    currentProject = projects.find( ({_id}) => _id === params.projectId ) 
  }

</script>

{#if loading}

  <p>Loading ...</p>

{:else}

  {#if currentProject}

    <ProjectWorkspace
      project={currentProject}
      close={()=> {replace('/')}}
      {googleReady}
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
            <button on:click={()=>{editProject = project;}}>⚙</button>
            <button on:click={()=>{push('/'+project._id)}}>open project</button>
            <!--a target="_blank" href="{playerURL}?project={project._id}">project link</a-->
        {/each}
        </ul>
      {/if}
        
      <button on:click={addProject}>new</button>

      <br />
      Import Project:
      <input type="file" on:change={handleFilesSubmit}/>
      <span>{uploadProgress}%</span>

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
      
      <h3>Export</h3>
      <button on:click={exportProject}>
        export "{editProject.name}"
      </button>

      <h3>Duplicate</h3>
      <button on:click={duplicateProject}>
        duplicate "{editProject.name}"
      </button>      

      <h3>Delete</h3>
      <button on:click={deleteProject}>
        delete "{editProject.name}"
      </button>

    {/if}

  {/if}

{/if}


<style>
  span:hover {
    cursor: pointer;
  }

  span {
    color: gray;
    padding-left: 1px;
    margin-bottom: 10px;
    position: relative;
    font-size: 10px;
    font-weight: normal;
  }
</style>