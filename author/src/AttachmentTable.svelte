<script>
  export let attachments;
  export let fileServerURL;
  export let doDeleteFile;

  const copyToClipboard = (key) => {
    navigator.clipboard.writeText(key).then(function() {
      /* clipboard successfully set */
    }, function() {
      console.warn("copy to clipboard failed")
    });    
  }

</script>

<table>
  <thead>
    <th>key</th>
    <th>name</th>
    <th>preview</th>
    <th>filename</th>
    <th>actions</th>
  </thead>
  <tbody>
    {#each attachments as attachment}
      <tr>
        <td>
          <span class="keycontainer" on:click={()=>copyToClipboard(attachment.key)}>
            <span class="key">
              {attachment.key}
            </span>
            <sup>copy</sup>
          </span>
        </td>
        <td title={attachment.name}>
          {attachment.name}
        </td>    
        <td>
          {#if attachment.simpletype === "image"}
            <a target="interkit_author_preview" href={fileServerURL + attachment.filename}>
              <img src={fileServerURL + attachment.filename} alt={attachment.filename} />
            </a>
          {:else if attachment.simpletype === "audio"}
            <audio controls>
              <source src={encodeURI(fileServerURL + attachment.filename)} type={attachment.mimetype}>
            </audio>        
          {:else}
            <small>{attachment.filetype}</small>
          {/if}
        </td>
        <td>
          {attachment.filename}
        </td>                      
        <td>
          <a target="_blank" title={fileServerURL + attachment.filename} href={fileServerURL + attachment.filename}>link</a>
          <span class="link" on:click={()=>doDeleteFile(attachment)}>delete</span>
        </td>
      </tr>
    {/each}
  </tbody>
</table>


<style>

  table {
    border-collapse: collapse;
    table-layout: fixed;
    width: 95%;
  }

  td {
    border: 1px lightgrey solid;
    padding: 0.25em;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
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

  .keycontainer {
    cursor: pointer;
    padding: 0.25em;
  }

  .keycontainer:hover {
    background-color: #eee;
    border-radius: 0.5em;
  }

  .keycontainer:active {
    background-color: #dde;
  }

  .key {
    max-width: 5em;
    display: inline-block;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  sup {
    color: blue;
    font-size: 60%;
    font-weight: bold;
    position: relative;
    left: -1ex;
    top: -0.2ex;
  }


</style>  