<script>
  import { onMount } from 'svelte';
  import { getConfig, upload, deleteFile } from '../../shared/util.js';

  import AttachmentTable from './AttachmentTable.svelte'
  import { token } from './stores.js';

  export let projectId;
  
  let attachments = [];
  let fileServerURL;
  let loading = true;

  const loadAttattchments = async () => {
    let result = await fetch("/api/file?project=" + projectId + "&$sort=name");
    let json = await result.json();
    if(json) {
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
        let newFile = await upload(file, (progress)=>{uploadProgress = progress + "%"}, projectId, true);
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

<h3>attachments</h3>

{#if !uploadProgress}
  <input type="file" bind:this={fileInput}>
  <button on:click={doUpload}>upload</button>
{:else}
  <span>{uploadProgress}</span>
{/if}

{#if loading }
  <p> Loading ... </p>
{:else}
  <h3>Project Attachments</h3>
  <AttachmentTable 
    attachments={attachments.filter(a => a.authored)} 
    {fileServerURL}
    {doDeleteFile}
    />
  <h3>Uploaded by Players</h3>
  <AttachmentTable 
    attachments={attachments.filter(a => !a.authored)}
    {fileServerURL}
    {doDeleteFile}
    />
{/if}

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