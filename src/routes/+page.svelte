<script lang="ts">
    import type { PageData } from "./$types";
    import { navigating } from "$app/stores";
    import { goto } from "$app/navigation";
    import type { NormalizedItem } from "$lib/rss";
    import Feeds from "$lib/components/Feeds.svelte";
    import Errors from "$lib/components/Errors.svelte";
    import Sources from "$lib/components/Sources.svelte";
    import Filters from "$lib/components/Filters.svelte";
    import Items from "$lib/components/Items.svelte";
    import Categories from "$lib/components/Categories.svelte";
    import { getSourceLabel } from "$lib/utils/source";
    let { data } = $props<{ data: PageData }>();

    let feedInput = $state(data.sources.join(", "));
    // Show filters if at least one feed was requested OR items loaded
    let hasFeeds = $state(data.sources.length > 0 || data.items.length > 0);
    $effect(() => { hasFeeds = data.sources.length > 0 || data.items.length > 0; });

    // Filters UI
    let searchText = $state("");
    let selectedCategory = $state("All");
    let groupByCategory = $state(false);
    let selectedSource = $state("All");
    type SortKey = "date" | "title" | "source";
    type SortDir = "asc" | "desc";
    let sortKey = $state<SortKey>("date");
    let sortDir = $state<SortDir>("desc");
    type DateFilter = "all" | `day:${string}`; // YYYY-MM-DD
    let dateFilter = $state<DateFilter>("all");
    let randomActive = $state(false);
    let randomKey = $state<string | null>(null);
    function getKey(it: NormalizedItem): string {
        return (
            (it.link && String(it.link)) ||
            // @ts-ignore optional id from normalizer
            (it as any).id ||
            `${it.title}|${it.dateISO || ""}`
        );
    }


    // Categories available given current non-category filters (source/date)
    const categories = $derived((() => {
        let items: NormalizedItem[] = data.items;
        if (dateFilter !== "all") {
            const key = dateFilter.slice(4);
            const start = new Date(`${key}T00:00:00`);
            const end = new Date(start);
            end.setDate(end.getDate() + 1);
            items = items.filter((it) => {
                if (!it.date) return false;
                const t = it.date.getTime();
                return t >= start.getTime() && t < end.getTime();
            });
        }
        if (selectedSource !== "All") {
            items = items.filter((it) => getSourceLabel(it) === selectedSource);
        }
        const set = new Set<string>();
        for (const it of items) {
            const cats = it.categories?.length ? it.categories : ["Uncategorized"];
            for (const c of cats) set.add(c.trim() || "Uncategorized");
        }
        const fallback = "Uncategorized";
        const list = Array.from(set);
        list.sort((a, b) => {
            if (a === fallback && b === fallback) return 0;
            if (a === fallback) return 1;
            if (b === fallback) return -1;
            return a.localeCompare(b);
        });
        return ["All", ...list];
    })());

    // Ensure selected category remains valid when filters change
    $effect(() => {
        if (!categories.includes(selectedCategory)) {
            selectedCategory = "All";
        }
    });
    function isGrouped(): boolean {
        if (!groupByCategory) return false;
        if (selectedCategory !== "All") return false;
        if (searchText.trim()) return false;
        if (dateFilter !== "all") return false;
        if (randomActive) return false;
        return true;
    }

    // Build grouped data respecting current non-category filters
    const grouped = $derived((() => {
        let items: NormalizedItem[] = data.items;
        if (dateFilter !== "all") {
            const key = dateFilter.slice(4);
            const start = new Date(`${key}T00:00:00`);
            const end = new Date(start);
            end.setDate(end.getDate() + 1);
            items = items.filter((it) => {
                if (!it.date) return false;
                const t = it.date.getTime();
                return t >= start.getTime() && t < end.getTime();
            });
        }
        if (selectedSource !== "All") {
            items = items.filter((it) => getSourceLabel(it) === selectedSource);
        }
       
        const byCategory: Record<string, NormalizedItem[]> = {};
        for (const it of items) {
            const cats = it.categories?.length ? it.categories : ["Uncategorized"];
            for (const c of cats) {
                const key = c.trim() || "Uncategorized";
                if (!byCategory[key]) byCategory[key] = [];
                byCategory[key].push(it);
            }
        }
        // Derive category list (alphabetical, place Uncategorized last)
        const keys = Object.keys(byCategory);
        const fallback = "Uncategorized";
        keys.sort((a, b) => {
            if (a === fallback && b === fallback) return 0;
            if (a === fallback) return 1;
            if (b === fallback) return -1;
            return a.localeCompare(b);
        });
        return { categories: keys, byCategory };
    })());

    function cmp<T extends string | number>(a: T, b: T) {
        if (typeof a === "number" && typeof b === "number") return a - b;
        return String(a).localeCompare(String(b));
    }

    function getBaseFilteredItems(): NormalizedItem[] {
        let items: NormalizedItem[] = data.items;
        // Date (day-only)
        if (dateFilter !== "all") {
            const key = dateFilter.slice(4);
            const start = new Date(`${key}T00:00:00`);
            const end = new Date(start);
            end.setDate(end.getDate() + 1);
            items = items.filter((it) => {
                if (!it.date) return false;
                const t = it.date.getTime();
                return t >= start.getTime() && t < end.getTime();
            });
        }
        if (selectedCategory !== "All") {
            items = items.filter((it: NormalizedItem) =>
                it.categories.includes(selectedCategory)
            );
        }
        if (selectedSource !== "All") {
            items = items.filter(
                (it: NormalizedItem) => getSourceLabel(it) === selectedSource
            );
        }

        const q = searchText.trim().toLowerCase();
        if (q) {
            items = items.filter((it: NormalizedItem) => {
                const src =
                    (it.source.title || "") + " " + (it.source.url || "");
                return (
                    it.title.toLowerCase().includes(q) ||
                    (it.summary || "").toLowerCase().includes(q) ||
                    src.toLowerCase().includes(q)
                );
            });
        }
        const mult = sortDir === "asc" ? 1 : -1;
        const withKey: Array<{ it: NormalizedItem; k: number | string }> =
            items.map((it: NormalizedItem) => ({
                it,
                k:
                    sortKey === "date"
                        ? it.date
                            ? it.date.getTime()
                            : 0
                        : sortKey === "title"
                          ? it.title
                          : it.source.title || "",
            }));
        withKey.sort((A, B) => mult * cmp(A.k, B.k));
        return withKey.map((x) => x.it);
    }
    function getFilteredItems(): NormalizedItem[] {
        const base = getBaseFilteredItems();
        if (randomActive && randomKey) {
            return base.filter((it) => getKey(it) === randomKey);
        }
        return base;
    }

    // Available dates (by day)
    function availableDays(): { key: string; label: string }[] {
        const fmt = (d: Date) =>
            d.toLocaleDateString(undefined, {
                day: "2-digit",
                month: "short",
                year: "numeric",
            });
        const set = new Map<string, string>();
        for (const it of data.items) {
            if (!it.date) continue;
            const key = it.date.toISOString().slice(0, 10); // YYYY-MM-DD
            if (!set.has(key)) set.set(key, fmt(it.date));
        }
        return Array.from(set.entries())
            .sort((a, b) => (a[0] < b[0] ? 1 : -1))
            .map(([key, label]) => ({ key, label }));
    }

    function submitFeeds(e: SubmitEvent) {
        e.preventDefault();
        const q = new URLSearchParams();
        const raw = feedInput
            .split(/[\n,]/)
            .map((s: string) => s.trim())
            .filter(Boolean);
        if (raw.length <= 3) {
            for (const r of raw) q.append("feed", r);
        } else {
            q.set("feeds", raw.join(","));
        }
        goto(`?${q.toString()}`);
    }

    function getSourceOptions(): string[] {
        const set = new Set<string>();
        for (const it of data.items) set.add(getSourceLabel(it));
        return ["All", ...Array.from(set).sort((a, b) => a.localeCompare(b))];
    }

    // Random as filter: toggle a random item from current set
    function onRandomClick() {
        if (!randomActive) {
            const base = getBaseFilteredItems();
            if (base.length === 0) return;
            const idx = Math.floor(Math.random() * base.length);
            randomKey = getKey(base[idx]);
            randomActive = true;
        } else {
            randomActive = false;
            randomKey = null;
        }
    }
    // If base filters change and the random selection no longer exists, pick another
    $effect(() => {
        if (!randomActive) return;
        const base = getBaseFilteredItems();
        if (base.length === 0) {
            randomActive = false;
            randomKey = null;
            return;
        }
        if (!randomKey || !base.some((it) => getKey(it) === randomKey)) {
            const idx = Math.floor(Math.random() * base.length);
            randomKey = getKey(base[idx]);
        }
    });
</script>

<section class="controls">
    <Feeds feedInput={feedInput} navigating={!!$navigating} on:submit={(e) => {
        feedInput = e.detail.feedInput;
        submitFeeds(new Event('submit') as any);
    }} />
    <Errors errors={data.errors} />
    {#if hasFeeds}
        <Sources sources={data.sources} />
    {/if}
</section>
{#if hasFeeds}
<Filters
    categories={categories}
    bind:selectedCategory={selectedCategory}
    bind:selectedSource={selectedSource}
    bind:dateFilter={dateFilter}
    days={availableDays()}
    randomActive={randomActive}
    groupByCategory={groupByCategory}
    sourceOptions={getSourceOptions()}
    on:toggleRandom={onRandomClick}
    on:toggleGroup={() => (groupByCategory = !groupByCategory)}
/>
{/if}

{#if $navigating}
    <div class="grid-overlay" role="status" aria-live="polite">
        <div class="spinner" aria-hidden="true"></div>
        <span class="grid-overlay__text">Loading…</span>
    </div>
{/if}

{#if data.items.length === 0}
    <div class="empty-state" role="status" aria-live="polite">
        <h2 class="empty-state__title">No items loaded</h2>
        <p class="empty-state__msg">Paste one or more RSS feed URLs above and press <strong>Load</strong> to get started.</p>
    </div>
{:else if isGrouped()}
    <Categories categories={grouped.categories} byCategory={grouped.byCategory} />
{:else}
    <Items items={getFilteredItems()} />
{/if}


