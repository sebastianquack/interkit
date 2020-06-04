<script>
  
  import Login from './Login.svelte';
  import {token} from './stores.js';
  import Router from './Router.svelte';

</script>


{#if $token}

  <Router/>

{:else}

  <Login/>

{/if}