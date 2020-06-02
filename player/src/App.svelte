<script>
  import { onMount } from 'svelte';
  import PlayerClient from './PlayerClient.svelte';

  let projectId;

  onMount(() => {    
    let searchParams = new URLSearchParams(window.location.search);
    projectId = searchParams.get("project");
  });

</script>

{#if projectId}   

  <PlayerClient {projectId} />
  
{:else}

  <p style="margin: 16px">nothing to see here...</p>

{/if}