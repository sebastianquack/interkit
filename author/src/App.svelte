<script>
  import { onMount, onDestroy } from 'svelte';

  import List from './List.svelte';
  import Login from './Login.svelte';

  import { initSocket } from '../../shared/socketClient.js';

  onMount(() => {
     initSocket();
  });

</script>

<h1>author interface</h1>

<Login/>

<List/>

