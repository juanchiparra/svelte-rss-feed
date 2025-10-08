// Minimal DOM-based RSS parser for browser usage

export type DomParsedFeed = {
    title?: string;
    link?: string;
    items: any[];
};

function getText(el: Element | null | undefined): string {
    return (el?.textContent || "").trim();
}

function getAttr(
    el: Element | null | undefined,
    name: string
): string | undefined {
    const v = el?.getAttribute(name);
    return v == null ? undefined : v;
}

function firstByLocalName(
    root: Document | Element,
    name: string
): Element | null {
    const list = (root as any).getElementsByTagNameNS
        ? (root as any).getElementsByTagNameNS("*", name)
        : (root as any).getElementsByTagName(name);
    return list && list.length ? (list[0] as Element) : null;
}

function allByLocalName(root: Document | Element, name: string): Element[] {
    const list = (root as any).getElementsByTagNameNS
        ? (root as any).getElementsByTagNameNS("*", name)
        : (root as any).getElementsByTagName(name);
    return Array.from(list) as Element[];
}

export function parseRss(doc: Document): DomParsedFeed | null {
    const channel =
        doc.querySelector("rss > channel, rdf\\:RDF > channel, channel") ||
        firstByLocalName(doc, "channel");
    if (!channel) return null;

    const title = getText(
        firstByLocalName(channel, "title") || channel.querySelector("title")
    );
    // RSS <link> can be nested or text
    const linkEl =
        firstByLocalName(channel, "link") ||
        channel.querySelector("link[href], link");
    const link = getAttr(linkEl, "href") || getText(linkEl);

    const items: any[] = [];
    const itemEls = allByLocalName(channel, "item");
    (itemEls.length
        ? itemEls
        : Array.from(channel.querySelectorAll("item"))
    ).forEach((it) => {
        const title = getText(
            firstByLocalName(it, "title") || it.querySelector("title")
        );
        const linkEl =
            firstByLocalName(it, "link") ||
            it.querySelector("link[href], link");
        const link = getAttr(linkEl, "href") || getText(linkEl);
        const guid = getText(
            firstByLocalName(it, "guid") || it.querySelector("guid")
        );
        const pubDate =
            getText(
                firstByLocalName(it, "pubDate") || it.querySelector("pubDate")
            ) ||
            getText(
                firstByLocalName(it, "date") ||
                    it.querySelector("dc\\:date, date")
            );
        const contentEncodedEl =
            firstByLocalName(it, "encoded") ||
            it.querySelector("content\\:encoded");
        const contentEncoded = contentEncodedEl
            ? contentEncodedEl.textContent || ""
            : undefined;
        const description = getText(
            firstByLocalName(it, "description") ||
                it.querySelector("description")
        );
        const enclosureEl =
            firstByLocalName(it, "enclosure") || it.querySelector("enclosure");
        const enclosure = enclosureEl
            ? {
                  url: getAttr(enclosureEl, "url"),
                  type: getAttr(enclosureEl, "type"),
              }
            : undefined;
        const media: any[] = [];
        const catEls = allByLocalName(it, "category");
        const categories = (
            catEls.length ? catEls : Array.from(it.querySelectorAll("category"))
        )
            .map((c: Element) => getText(c))
            .filter(Boolean);

        items.push({
            title,
            link,
            guid,
            pubDate,
            description,
            content: description,
            ["content:encoded"]: contentEncoded,
            ["media:content"]: media,
            enclosure,
            categories,
        });
    });

    return { title, link, items };
}

export function parseAtom(doc: Document): DomParsedFeed | null {
    const feed = firstByLocalName(doc, "feed") || doc.querySelector("feed");
    if (!feed) return null;

    const title = getText(
        firstByLocalName(feed, "title") || feed.querySelector("title")
    );
    let link: string | undefined = undefined;
    const feedLinks = allByLocalName(feed, "link");
    const linkNodes = feedLinks.length
        ? feedLinks
        : Array.from(feed.querySelectorAll("link[href]"));
    for (const le of linkNodes) {
        const rel = (le.getAttribute("rel") || "alternate").toLowerCase();
        const href = getAttr(le, "href");
        if (href && (rel === "alternate" || !link)) {
            link = href;
            if (rel === "alternate") break;
        }
    }

    const items: any[] = [];
    const entryEls = allByLocalName(feed, "entry");
    (entryEls.length
        ? entryEls
        : Array.from(feed.querySelectorAll("entry"))
    ).forEach((en) => {
        const title = getText(
            firstByLocalName(en, "title") || en.querySelector("title")
        );
        let link: string | undefined = undefined;
        const links = allByLocalName(en, "link");
        const linkEls = links.length
            ? links
            : Array.from(en.querySelectorAll("link[href]"));
        for (const le of linkEls) {
            const rel = (le.getAttribute("rel") || "alternate").toLowerCase();
            const href = getAttr(le, "href");
            if (href && (rel === "alternate" || !link)) {
                link = href;
                if (rel === "alternate") break;
            }
        }
        const guid = getText(
            firstByLocalName(en, "id") || en.querySelector("id")
        );
        const published = getText(
            firstByLocalName(en, "published") || en.querySelector("published")
        );
        const updated = getText(
            firstByLocalName(en, "updated") || en.querySelector("updated")
        );
        const contentEl =
            firstByLocalName(en, "content") || en.querySelector("content");
        const contentType = getAttr(contentEl, "type") || "text";
        const contentRaw = contentEl ? contentEl.textContent || "" : "";
        const summary = getText(
            firstByLocalName(en, "summary") || en.querySelector("summary")
        );
        const enclosureEl = linkEls.find(
            (le) => (le.getAttribute("rel") || "").toLowerCase() === "enclosure"
        ) as Element | undefined;
        const enclosure = enclosureEl
            ? {
                  url: getAttr(enclosureEl, "href"),
                  type: getAttr(enclosureEl, "type"),
              }
            : undefined;
        const media: any[] = [];
        const catEls = allByLocalName(en, "category");
        const categories = (
            catEls.length ? catEls : Array.from(en.querySelectorAll("category"))
        )
            .map((c: Element) => getAttr(c, "term") || getText(c))
            .filter(Boolean) as string[];

        items.push({
            title,
            link,
            guid,
            isoDate: updated || published || undefined,
            content: summary,
            ["content:encoded"]: contentType.includes("html")
                ? contentRaw
                : undefined,
            ["media:content"]: media,
            enclosure,
            categories,
        });
    });

    return { title, link, items };
}

export function parseFeedXML(xml: string): DomParsedFeed {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, "application/xml");
    const isParserError = doc.querySelector("parsererror");
    if (isParserError) throw new Error("Invalid XML");

    return (
        parseRss(doc) ||
        parseAtom(doc) || {
            title: undefined,
            link: undefined,
            items: [],
        }
    );
}
