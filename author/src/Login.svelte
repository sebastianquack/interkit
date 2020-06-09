<script>
  
  import { token, userId, loggedInUsername } from './stores.js';
  let username = "admin"
  let password = "password";

  export let onLogin = ()=>{};

  async function submit() {
    const response = await fetch("/api/login", {
      method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
      body: JSON.stringify({username, password})
    });
    const json = await response.json();
    if(json.token && json.user) {
      token.set(json.token);  
      userId.set(json.user._id);
      loggedInUsername.set(json.user.username);

      await onLogin();
    } else {
      if(json.error) {
        alert(json.message);
      }
    }
  }

</script>

<input bind:value={username} type="text"/><br/>
<input bind:value={password} type="password"/><br/>
<button on:click={submit}>login</button>