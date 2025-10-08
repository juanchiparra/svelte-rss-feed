<script lang="ts">
  import type { NormalizedItem } from '$lib/rss';
  import { domain, relativeDate } from '$lib/utils/format';
  let { item, index = 0 } = $props<{ item: NormalizedItem; index?: number }>();

  function fallbackImg(ev: Event) {
    const el = ev.currentTarget as HTMLImageElement;
    el.style.display = 'none';
  }
  function getSourceLabel() {
    return item.source.title || domain(item.source.url);
  }
</script>

<article class="card" data-index={index}>
  <a class="card__image" href={item.link} target="_blank" rel="noopener noreferrer" aria-label={item.title}>
    {#if item.image}
      <img src={item.image} alt={item.title} loading={index < 12 ? 'eager' : 'lazy'} decoding="async" onerror={fallbackImg} />
    {/if}
  </a>
  <div class="card__body">
    <h3 class="card__title"><a href={item.link} target="_blank" rel="noopener noreferrer">{item.title}</a></h3>
    <p class="card__summary">{item.summary}</p>
  </div>
  <div class="card__meta">
    <span class="source">{getSourceLabel()}</span>
    {#if item.dateISO}<time datetime={item.dateISO}>{relativeDate(item.dateISO)}</time>{/if}
  </div>
</article>
