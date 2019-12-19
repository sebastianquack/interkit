<script>
  
  import { token } from './stores.js';
  let username = "admin"
  let password = "password";

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

</script>

<input bind:value={username} type="text"/><br/>
<input bind:value={password} type="password"/><br/>
<button on:click={submit}>login</button>