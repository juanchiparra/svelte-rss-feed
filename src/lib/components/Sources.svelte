<script lang="ts">
  import { domain } from '$lib/utils/format';
  let { sources = [] } = $props<{ sources: string[] }>();
</script>

{#if sources.length}
  <div class="sources">
    <span class="filter-label">Sources:</span>
    {#each sources as s}
      <a class="source-pill" href={s} target="_blank" rel="noopener noreferrer">{domain(s)}</a>
    {/each}
  </div>
{/if}
