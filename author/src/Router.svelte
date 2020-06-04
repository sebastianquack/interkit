<script>
    import Router from 'svelte-spa-router'

    import ProjectManager from './ProjectManager.svelte'
    
    // see https://github.com/ItalyPaleAle/svelte-spa-router/blob/master/README.md

    const routes = {
        '/:projectId?': ProjectManager,
    }
</script>

<Router {routes} />