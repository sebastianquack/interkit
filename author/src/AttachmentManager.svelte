<script>
  import { onMount } from 'svelte';
  import { getConfig, upload, deleteFile } from '../../shared/util.js';

  import { token } from './stores.js';

  export let projectId;
  export let close;

  let attachments = [];
  let fileServerURL;
  let loading = true;

  const loadAttattchments = async () => {
    let result = await fetch("/api/file?project=" + projectId);
    let json = await result.json();
    if(json) {
       json.docs.sort(function (a, b) {
        return a.filename.toLowerCase().localeCompare(b.filename.toLowerCase());
      });
      attachments = json.docs;
      console.log(attachments);
    }

    fileServerURL = await getConfig("fileServerURL");
  }

  onMount( async ()=>{
    await loadAttattchments()
    loading = false
  });

  let fileInput;
  let uploadProgress = "";
  
  const doUpload = () => {
    console.log(fileInput.files);
    if(fileInput.files.length) {
      Array.from(fileInput.files).forEach(async (file)=>{
        uploadProgress = "";
        let newFile = await upload(file, (progress)=>{uploadProgress = progress + "%"}, projectId);
        uploadProgress = "";
        if(newFile)
          attachments = attachments.concat(newFile);
      })
    }
  }

  const doDeleteFile = async (file) => {
    if(confirm("really?")) {
      await deleteFile(file, $token);
      loadAttattchments();
    }
  }

</script>

<div class="container">

<h3>attachments<button on:click={close}>close</button></h3>

{#if !uploadProgress}
  <input type="file" bind:this={fileInput}>
  <button on:click={doUpload}>upload</button>
{:else}
  <span>{uploadProgress}</span>
{/if}

{#if loading }
  <p> Loading ... </p>
{:else}
  <ul>
    {#each attachments as attachment}
      <li>
        {attachment.filename}
        {#if attachment.simpletype === "image"}
          <img src={fileServerURL + attachment.filename} alt={attachment.filename} />
        {:else if attachment.simpletype === "audio"}
          <audio controls>
            <source src={encodeURI(fileServerURL + attachment.filename)} type={attachment.mimetype}>
          </audio>        
        {:else}
          <small>{attachment.filetype}</small>
        {/if}
        <a target="_blank" title={fileServerURL + attachment.filename} href={fileServerURL + attachment.filename}>link</a>
        <span class="link" on:click={()=>doDeleteFile(attachment)}>delete</span>
      </li>
    {/each}
  </ul>
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

  img {
    width: 1em;
    height: 1em;
    object-fit: contain;
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