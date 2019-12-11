<script>
  
  import { token } from './stores.js';
  let username;
  let password;

  async function submit() {
    const response = await fetch("/api/login", {
      method: 'POST',
      body: JSON.stringify({username, password})
    });
    const json = await response.json();
    console.log(json);
    if(json.token) {
      token.set(json.token);  
    } else {
      if(json.error) {
        alert(json.message);
      }
    }
  }

  function logout() {
    console.log("logout");
    token.set(null);
  }

</script>

{#if !$token}

<input bind:value={username} type="text"/><br/>
<input bind:value={password} type="text"/><br/>
<button on:click={submit}>login</button>

{:else}

<button on:click={logout}>logout</button>

{/if}