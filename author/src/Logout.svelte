<script>
  
  import { token, userId, loggedInUsername } from './stores.js';

  function logout() {
    console.log("logout");
    token.set(null);
    userId.set(null);
    loggedInUsername.set(null);
  }

</script>

<button on:click={logout}>logout</button>

<style>
  button {
    z-index: 1;
    position: relative;
  }

</style>