<script lang="ts">
  import type { NormalizedItem } from '$lib/rss';
  import { masonry } from '$lib/actions/masonry';
  import Card from './Card.svelte';
  let { categories = [] as string[], byCategory = {} as Record<string, NormalizedItem[]> } = $props<any>();
</script>

{#each categories as cat}
  <section class="category">
    <h2 class="category__title">{cat}</h2>
    <div class="gallery masonry" use:masonry>
      {#each byCategory[cat] as item, i}
        <Card {item} index={i} />
      {/each}
    </div>
  </section>
{/each}
