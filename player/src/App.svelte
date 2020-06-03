<script>
  import { onMount } from 'svelte';
  import PlayerContainer from './PlayerContainer.svelte';

  let projectId;

  onMount(() => {    
    let searchParams = new URLSearchParams(window.location.search);
    projectId = searchParams.get("project");
  });

</script>


<div class="app-container">

{#if projectId}   

  
    <PlayerContainer {projectId} />
  
  
{:else}

  <p style="margin: 16px">nothing to see here...</p>

{/if}

</div>


<style>


.app-container {
    position: absolute;
    top: 0;
    width: 100%;
    height: 100%;
    max-width: 600px;
    background-color: white;
    left: 50%;
    transform: translate(-50%, 0);
    box-sizing: border-box;
  }

</style>