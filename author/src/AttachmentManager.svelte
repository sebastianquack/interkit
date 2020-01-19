<script>
  import { onMount } from 'svelte';
  import { getConfig, upload, deleteFile } from '../../shared/util.js';

  import { token } from './stores.js';

  export let boardId;

  let attachments = [];
  let fileServerURL;

  const loadAttattchments = async () => {
    let result = await fetch("/api/file");
    let json = await result.json();
    if(json) {
      attachments = json.docs;
      console.log(attachments);
    }

    fileServerURL = await getConfig("fileServerURL");
  }

  onMount(loadAttattchments);

  let fileInput;
  let uploadProgress = "";
  
  const doUpload = () => {
    console.log(fileInput.files);
    if(fileInput.files.length) {
      Array.from(fileInput.files).forEach(async (file)=>{
        uploadProgress = "";
        let newFile = await upload(file, (progress)=>{uploadProgress = progress + "%"});
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

<h3>attachments</h3>

<ul>
  {#each attachments as attachment}
    <li>{attachment.filename} 
      <a href={fileServerURL + attachment.filename}>link</a>
      <span class="link" on:click={()=>doDeleteFile(attachment)}>delete</span>
    </li>
  {/each}
</ul>

{#if !uploadProgress}
  <input type="file" bind:this={fileInput}>
  <button on:click={doUpload}>upload</button>
{:else}
  <span>{uploadProgress}</span>
{/if}



<style>
  span.link {
    color: rgb(0,100,200);
    text-decoration: none;
  }
  span.link:hover {
    cursor: pointer;
    text-decoration: underline;
  }

</style>  