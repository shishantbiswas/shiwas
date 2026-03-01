<script lang="ts">
  import { useSWR } from 'shiwas/svelte'
  
  const { data, error, isLoading, isValidating } = useSWR(
    "https://jsonplaceholder.typicode.com/posts/2",
    (url: string) => fetch(url).then(res => res.json())
  );
  console.log(data, error, isLoading, isValidating);
</script>

<main>
  <h3>Svelte + Shiwas</h3>
  
  <div class="card">
    {#if $isLoading}
      <p>Loading post data...</p>
    {:else if $error}
      <p>Error loading data: {$error.message}</p>
    {:else if $data}
      <h2>{$data.title}</h2>
      <p>{$data.body}</p>
      
      {#if $isValidating}
        <p class="updating"><small>Background updating...</small></p>
      {/if}
    {/if}
  </div>
</main>

<style>
  main {
    font-family: system-ui, -apple-system, sans-serif;
    padding: 2rem;
    max-width: 600px;
    margin: 0 auto;
  }
  .card {
    padding: 1.5rem;
    border: 1px solid #ddd;
    border-radius: 8px;
    background: #fdfdfd;
    box-shadow: 0 4px 6px rgba(0,0,0,0.05);
  }
  h2 {
    margin-top: 0;
    color: #333;
  }
  .updating {
    color: #888;
    font-style: italic;
  }
</style>
