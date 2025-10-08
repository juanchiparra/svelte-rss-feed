<script lang="ts">
  import type { NormalizedItem } from '$lib/rss';
  import { masonry } from '$lib/actions/masonry';
  import Card from './Card.svelte';
  let { items = [] as NormalizedItem[] } = $props<{ items: NormalizedItem[] }>();
</script>

<section class="category">
  <h2 class="category__title">Results</h2>
  <div class="gallery masonry" use:masonry>
    {#each items as item, i}
      <Card {item} index={i} />
    {/each}
  </div>
</section>
