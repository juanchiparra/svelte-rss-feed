import { parseFeedXML } from "./rss-dom";
import taxonomy from "$lib/taxonomy.json";

export type NormalizedItem = {
    id: string;
    title: string;
    link: string;
    date: Date | null;
    dateISO?: string;
    categories: string[];
    image?: string | null;
    summary?: string;
    source: { title?: string; url?: string };
};

type ParserItem = {
    guid?: string;
    enclosure?: { url?: string; type?: string };
    [key: string]: any;
};

// Safely unwrap rss-parser / xml2js values into strings
function toText(v: any): string {
    if (v == null) return "";
    if (typeof v === "string") return v;
    if (Array.isArray(v)) return toText(v[0]);
    if (typeof v === "object") {
        // common xml2js shapes
        if (typeof (v as any)._ === "string") return (v as any)._ as string;
        if (typeof (v as any)["#text"] === "string")
            return (v as any)["#text"] as string;
        if (typeof (v as any).href === "string")
            return (v as any).href as string;
        if (v.$ && typeof v.$.href === "string") return v.$.href as string;
        if (v.$ && typeof v.$.url === "string") return v.$.url as string;
        if (typeof (v as any).url === "string") return (v as any).url as string;
    }
    try {
        return String(v);
    } catch {
        return "";
    }
}

function extractImgFromHtml(html?: string | null): string | null {
    if (!html) return null;
    const m = html.match(/<img\s+[^>]*src=["']([^"']+)["'][^>]*>/i);
    return m ? m[1] : null;
}

function coerceDate(item: ParserItem): { date: Date | null; iso?: string } {
    const iso = (item as any).isoDate as string | undefined;
    const pub = (item as any).pubDate as string | undefined;
    const raw = iso || pub;
    if (!raw) return { date: null };
    const d = new Date(raw);
    return isNaN(d.getTime())
        ? { date: null }
        : { date: d, iso: d.toISOString() };
}

function pickImage(item: ParserItem): string | null {
    const enc = item.enclosure;
    if (enc?.url && (!enc.type || enc.type.startsWith("image/")))
        return enc.url;
    const media = (item as any)["media:content"];
    if (media) {
        if (Array.isArray(media)) {
            const img =
                media.find((m: any) => m.$?.url)?.$?.url ||
                media.find((m: any) => m.url)?.url;
            if (img) return img;
        } else if (typeof media === "object") {
            const img = media?.$?.url || media?.url;
            if (img) return img;
        }
    }
    const contentEncoded = (item as any)["content:encoded"] as
        | string
        | undefined;
    const fromEncoded = extractImgFromHtml(contentEncoded);
    if (fromEncoded) return fromEncoded;
    const fromContent = extractImgFromHtml(item.content);
    if (fromContent) return fromContent;
    const image = (item as any).image as string | undefined;
    if (image) return image;
    return null;
}

// --- Derived categories ----------------------------------------------------
function stripHtml(html?: string | null): string {
    if (!html) return "";
    return String(html).replace(/<[^>]*>/g, " ");
}

function normalizeText(s: string): string {
    // lower + strip accents
    return s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
}

function stripAttribution(text: string, sourceTitle?: string): string {
    if (!text) return "";
    let out = text;
    const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const site = sourceTitle ? esc(sourceTitle) : "";
    const patterns: RegExp[] = [
        /(?:^|\s)(?:The\s+post|This\s+article)[^.\n]*\bappeared\s+first\s+on\b[^.\n]*[.\n]?/gi,
        /(?:^|\s)Originally\s+published\s+(?:on|in)[^.\n]*[.\n]?/gi,
        /(?:^|\s)(?:El|La|Esta|Este)\s+(?:art[íi]culo|entrada|publicaci[óo]n|post)[^.\n]*\b(?:se\s+public[óo]|publicado|publicada)\s+(?:primero|originalmente)\s+en\b[^.\n]*[.\n]?/gi,
        /(?:^|\s)apareci[óo]\s+primero\s+en\b[^.\n]*[.\n]?/gi,
    ];
    if (site) {
        patterns.push(
            new RegExp(
                `(?:^|\\s)(?:apareci[óo]\\s+primero\\s+en|se\\s+public[óo]\\s+(?:primero|originalmente)\\s+en|appeared\\s+first\\s+on)\\s+${site}[^.\\n]*[.\\n]?`,
                "gi"
            )
        );
    }
    for (const re of patterns) out = out.replace(re, " ");
    return out.replace(/\s+/g, " ").trim();
}

type Taxon = {
    name: string;
    aliases?: string[];
    keywords: (string | RegExp)[];
};
const FALLBACK_LABEL: string =
    (taxonomy as any).fallbackLabel || "Uncategorized";
const TAXONOMY: Taxon[] = ((taxonomy as any).categories || []).map(
    (c: any) => ({
        name: c.name as string,
        aliases: (c.aliases || []) as string[],
        keywords: (c.keywords || []).map((k: string) => k as string),
    })
);

const NAME_MAP: Record<string, string> = (() => {
    const map: Record<string, string> = {};
    for (const t of TAXONOMY) {
        const key = normalizeText(t.name);
        map[key] = t.name;
        for (const a of t.aliases || []) map[normalizeText(a)] = t.name;
    }
    return map;
})();

function classifyCategoriesFromText(text: string): string[] {
    const t = normalizeText(text);
    const scores: { name: string; score: number }[] = [];
    for (const tax of TAXONOMY) {
        let s = 0;
        for (const k of tax.keywords) {
            if (typeof k === "string") {
                const kw = normalizeText(k);
                const re = new RegExp(
                    `\\b${kw.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\$&")}\\b`,
                    "g"
                );
                s += (t.match(re) || []).length;
            } else {
                s += (t.match(k) || []).length;
            }
        }
        if (s > 0) scores.push({ name: tax.name, score: s });
    }
    if (!scores.length) return [];
    scores.sort((a, b) => b.score - a.score);
    const top = scores[0].score;
    const selected = scores
        .filter((x) => x.score >= Math.max(1, Math.round(top * 0.6)))
        .slice(0, 3);
    return selected.map((x) => x.name);
}

function buildClassificationText(item: ParserItem): string {
    const parts: string[] = [];
    if (item.title) parts.push(toText(item.title));
    if ((item as any).contentSnippet)
        parts.push(toText((item as any).contentSnippet));
    const encodedRaw = (item as any)["content:encoded"] as any;
    const encoded = toText(encodedRaw);
    if (encoded) parts.push(stripHtml(encoded));
    if (item.content) parts.push(stripHtml(toText(item.content)));
    if (Array.isArray(item.categories))
        parts.push(item.categories.map((c: any) => toText(c)).join(" "));
    return parts.join(" \n ").slice(0, 4000);
}

// Timeouts
const FEED_ATTEMPT_TIMEOUT_MS = 4000; // Max per individual attempt
const FEED_TOTAL_TIMEOUT_MS = 6500; // Tope total por feed antes de abortar intentos restantes
const FEED_TIMEOUT_MS = FEED_ATTEMPT_TIMEOUT_MS; // parser internal timeout
// Client/browser: we'll parse XML via DOM; on server we don't currently fetch
// during prerender, so no Node parser is needed here.

async function getXml(url: string, fetchFn: typeof fetch) {
    // Use only simple headers to reduce CORS preflight issues in browsers
    const res = await fetchFn(url, {
        headers: {
            Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml, text/plain, */*",
        },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
}

function toHttp(url: string) {
    try {
        const u = new URL(url);
        u.protocol = "http:";
        return u.toString();
    } catch {
        return url;
    }
}

function allOrigins(url: string) {
    return `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
}

function corsAnywhere(url: string) {
    // Public demo has rate-limits; only as last resort
    return `https://cors.isomorphic-git.org/${encodeURIComponent(url)}`;
}

function normalizeItem(
    item: ParserItem,
    feedMeta?: { title?: string; link?: string }
): NormalizedItem {
    const { date, iso } = coerceDate(item);
    const link = toText(item.link).trim();
    const title = (toText(item.title) || "(untitled)").trim();
    const id = (toText((item as any).guid) ||
        link ||
        title + (iso || "")) as string;
    const originalCats =
        (item.categories as any[] | undefined)
            ?.filter(Boolean)
            .map((c) => toText(c)) || [];
    let summary =
        toText((item as any).contentSnippet).trim() ||
        (item.content
            ? toText(item.content)
                  .replace(/<[^>]+>/g, "")
                  .slice(0, 280)
            : "") ||
        "";
    summary = stripAttribution(summary, feedMeta?.title);
    const image = pickImage(item);
    // Derive normalized categories from textual content
    const derived = classifyCategoriesFromText(buildClassificationText(item));
    // Map any original categories via aliases to known names; drop unknown ones
    const mappedOriginal = originalCats
        .map((c) => NAME_MAP[normalizeText(c)])
        .filter(Boolean) as string[];
    const combined = Array.from(
        new Set([...(derived || []), ...mappedOriginal])
    );
    const categories = combined.length ? combined : [FALLBACK_LABEL];
    return {
        id,
        title,
        link,
        date,
        dateISO: iso,
        categories,
        image,
        summary,
        source: { title: feedMeta?.title, url: feedMeta?.link },
    };
}

export type FetchFeedsResult = {
    items: NormalizedItem[];
    errors: { url: string; message: string }[];
};

export async function fetchFeeds(
    urls: string[],
    fetchFn?: typeof fetch
): Promise<FetchFeedsResult> {
    const uniq = Array.from(new Set(urls.map((u) => u.trim()).filter(Boolean)));
    const errors: FetchFeedsResult["errors"] = [];
    const f = fetchFn ?? fetch;

    function isProbablyInvalid(u: string): boolean {
        try {
            const parsed = new URL(u);
            return !parsed.protocol.startsWith("http");
        } catch {
            return true;
        }
    }

    const raceWithTimeout = async <T>(
        ms: number,
        label: string,
        fn: () => Promise<T>
    ): Promise<T> => {
        let timer: any;
        return await Promise.race<Promise<T>>([
            fn(),
            new Promise<T>((_, reject) => {
                timer = setTimeout(
                    () => reject(new Error(`${label} timeout`)),
                    ms
                );
            }),
        ]).finally(() => clearTimeout(timer));
    };

    const perFeedPromises = uniq.map(async (url) => {
        const started = Date.now();
        if (isProbablyInvalid(url)) {
            errors.push({ url, message: "Invalid URL" });
            return [] as NormalizedItem[];
        }
        const deadline = started + FEED_TOTAL_TIMEOUT_MS;
        const attempts: Array<{ label: string; run: () => Promise<any> }> = [
            {
                label: "direct+xml+dom",
                run: async () => parseFeedXML(await getXml(url, f)),
            },
            {
                label: "proxy+dom",
                run: async () => parseFeedXML(await getXml(allOrigins(url), f)),
            },
            {
                label: "http+xml+dom",
                run: async () => parseFeedXML(await getXml(toHttp(url), f)),
            },
            {
                label: "proxy+http+dom",
                run: async () =>
                    parseFeedXML(await getXml(allOrigins(toHttp(url)), f)),
            },
            {
                label: "corsAnywhere+dom",
                run: async () =>
                    parseFeedXML(await getXml(corsAnywhere(url), f)),
            },
        ];
        for (const a of attempts) {
            if (Date.now() > deadline) break;
            try {
                const feed = await raceWithTimeout(
                    FEED_ATTEMPT_TIMEOUT_MS,
                    a.label,
                    a.run
                );
                const meta = {
                    title: toText((feed as any).title) || undefined,
                    link: toText((feed as any).link) || undefined,
                };
                return (feed.items || []).map((it: ParserItem) =>
                    normalizeItem(it, meta)
                );
            } catch (e: any) {
                // Continue to next attempt unless total time exceeded
                if (Date.now() > deadline) break;
            }
        }
        errors.push({ url, message: "Timeout / error reading feed" });
        return [] as NormalizedItem[];
    });

    const results = await Promise.all(perFeedPromises);

    const items = results.flat().sort((a, b) => {
        const ta = a.date ? a.date.getTime() : 0;
        const tb = b.date ? b.date.getTime() : 0;
        return tb - ta;
    });

    return { items, errors };
}
