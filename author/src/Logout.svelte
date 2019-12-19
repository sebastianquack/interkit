<script>
  
  import { token } from './stores.js';

  function logout() {
    console.log("logout");
    token.set(null);
  }

</script>

<button on:click={logout}>logout</button>

<style>
  button {
    z-index: 1;
    position: relative;
  }

</style>