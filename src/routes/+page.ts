import type { PageLoad } from "./$types";
import { fetchFeeds, type NormalizedItem } from "$lib/rss";
import taxonomy from "$lib/taxonomy.json";

export type PageData = {
    items: NormalizedItem[];
    byCategory: Record<string, NormalizedItem[]>;
    categories: string[];
    errors: { url: string; message: string }[];
    sources: string[];
};

export const load: PageLoad = async ({ url, fetch, depends, data }) => {
    // During prerender, SvelteKit disallows url.searchParams. Only run on client.
    // We allow a minimal SSR pass that produces empty state, then client-side hydration populates.
    if (import.meta.env.SSR) {
        return {
            items: [],
            byCategory: {},
            categories: [],
            errors: [],
            sources: [],
        } satisfies PageData;
    }

    depends("app:feeds");

    const feedParams = url.searchParams.getAll("feed");
    const feedsCSV = url.searchParams.get("feeds");
    const sources = new Set<string>();
    feedParams.forEach((f) => sources.add(f));
    if (feedsCSV) feedsCSV.split(",").forEach((f) => sources.add(f.trim()));

    const feedUrlsRaw = Array.from(sources.size ? sources : []);
    const feedUrls = feedUrlsRaw
        .map((u) => u.trim())
        .filter((u) => u.length > 0);

    const { items, errors } = await fetchFeeds(feedUrls, fetch);
    const fallback = (taxonomy as any).fallbackLabel ?? "Uncategorized";

    const byCategory: Record<string, NormalizedItem[]> = {};
    for (const it of items) {
        const cats = it.categories.length ? it.categories : [fallback];
        for (const c of cats) {
            const key = c.trim() || "Uncategorized";
            byCategory[key] ||= [];
            byCategory[key].push(it);
        }
    }

    const categories = Object.keys(byCategory).sort((a, b) => {
        if (a === fallback && b === fallback) return 0;
        if (a === fallback) return 1;
        if (b === fallback) return -1;
        return a.localeCompare(b);
    });

    return {
        items,
        byCategory,
        categories,
        errors,
        sources: feedUrls,
    } satisfies PageData;
};
