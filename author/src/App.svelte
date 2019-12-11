<script>
  import { onMount } from 'svelte';

  let scriptNodes = [];

  onMount(async () => {
    const res = await fetch("/api/scriptNode");
    const json = await res.json();
    scriptNodes = json.docs;
  });
    
</script>

<h1>author interface</h1>
{#each scriptNodes as scriptNode}
  <li>{scriptNode.name}</li>
{/each}