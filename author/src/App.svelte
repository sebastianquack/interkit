<script>
  
  import Login from './Login.svelte';
  import {token} from './stores.js';
  import ProjectManager from './ProjectManager.svelte';

</script>


{#if $token}

  <ProjectManager/>

{:else}

  <Login/>

{/if}