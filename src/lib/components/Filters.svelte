<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  type DateFilter = 'all' | `day:${string}`;
  export let categories: string[] = [];
  export let selectedCategory: string = 'All';
  export let selectedSource: string = 'All';
  export let dateFilter: DateFilter = 'all';
  export let days: { key: string; label: string }[] = [];
  export let randomActive = false;
  export let groupByCategory = false;
  export let randomDisabled = false;
  export let groupDisabled = false;
  export let sourceOptions: string[] = [];
  const dispatch = createEventDispatcher();
  function toggleRandom() { dispatch('toggleRandom'); }
  function toggleGroup() { dispatch('toggleGroup'); }
</script>

<nav class="filters">
  <div class="filters__row">
    <div class="filters__group filters__categories">
      <span class="filter-label">Categories:</span>
      <div class="categories-select" aria-hidden="false">
        <select class="filter-select" aria-label="Select category" bind:value={selectedCategory}>
          {#each categories as c}
            <option value={c}>{c}</option>
          {/each}
        </select>
      </div>
    </div>
    <div class="filters__group filters__sources">
      <span class="filter-label">Source:</span>
      <div class="sources-select" aria-hidden="false">
        <select class="filter-select" aria-label="Select source" bind:value={selectedSource}>
          {#each sourceOptions as s}
            <option value={s}>{s}</option>
          {/each}
        </select>
      </div>
    </div>
    <div class="filters__group filters__date">
      <span class="filter-label">Date:</span>
      <label>
        <span class="sr-only">Date range</span>
        <select class="filter-select" aria-label="Date range" bind:value={dateFilter}>
          <option value="all">All</option>
          {#each days as d}
            <option value={`day:${d.key}`}>{d.label}</option>
          {/each}
        </select>
      </label>
    </div>
  </div>
  <div class="filters__row">
    <div class="filters__group filters__random">
      <button class="filter-btn" type="button" onclick={toggleRandom} aria-pressed={randomActive} disabled={groupByCategory || randomDisabled} title="Random item (filter)">Random</button>
    </div>
    <div class="filters__group filters__grouping">
      <button class="filter-btn" type="button" onclick={toggleGroup} aria-pressed={groupByCategory} disabled={randomActive || groupDisabled} title="Group by category">Group</button>
    </div>
  </div>
</nav>
