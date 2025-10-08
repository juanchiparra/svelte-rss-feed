<script lang="ts">
  interface FeedError { url: string; message: string }
  let { errors = [] } = $props<{ errors: FeedError[] }>();
</script>

{#if errors.length}
  <div class="errors">
    <strong>Errors reading feeds:</strong>
    <ul>
      {#each errors as err}
        <li><code>{err.url}</code>: {err.message}</li>
      {/each}
    </ul>
  </div>
{/if}
