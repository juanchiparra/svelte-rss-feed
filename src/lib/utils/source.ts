import type { NormalizedItem } from "../rss";
import { domain } from "./format";

export function getSourceLabel(it: NormalizedItem): string {
    return (
        (it.source.title && it.source.title.trim()) ||
        domain(it.source.url) ||
        "Unknown source"
    );
}
