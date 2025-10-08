<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();
  let { feedInput = '', navigating = false } = $props<{ feedInput: string; navigating: boolean }>();

  function onSubmit(e: SubmitEvent) {
    e.preventDefault();
    dispatch('submit', { feedInput });
  }
</script>

<form class="feed-form" onsubmit={onSubmit}>
  <label class="filter-label" for="feeds">Feeds (URLs):</label>
  <textarea
    id="feeds"
    class="filter-input feed-textarea"
    rows={3}
    bind:value={feedInput}
    placeholder="https://example.com/rss, https://another.com/feed"
  ></textarea>
  <div class="actions">
    <button class="filter-btn" type="submit" disabled={navigating}>Load</button>
  </div>
</form>
