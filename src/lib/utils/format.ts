export function domain(u?: string) {
    try {
        return u ? new URL(u).hostname.replace(/^www\./, "") : "";
    } catch {
        return "";
    }
}

export function relativeDate(iso?: string) {
    if (!iso) return "";
    try {
        const d = new Date(iso);
        const now = new Date();
        let diff = now.getTime() - d.getTime();
        if (diff < 0) diff = 0;
        const sec = Math.floor(diff / 1000);
        const min = Math.floor(sec / 60);
        const hrs = Math.floor(min / 60);
        const days = Math.floor(hrs / 24);
        const isYesterday = (() => {
            const a = new Date(now);
            a.setHours(0, 0, 0, 0);
            const b = new Date(d);
            b.setHours(0, 0, 0, 0);
            const dd = Math.round((a.getTime() - b.getTime()) / 86400000);
            return dd === 1;
        })();
        if (sec < 60) return "just now";
        if (min < 60) return min === 1 ? "a minute ago" : `${min} minutes ago`;
        if (hrs < 24) return hrs === 1 ? "an hour ago" : `${hrs} hours ago`;
        if (isYesterday) return "yesterday";
        if (days < 7) return days === 1 ? "a day ago" : `${days} days ago`;
        return d
            .toLocaleDateString(undefined, {
                day: "numeric",
                month: "short",
                year: "numeric",
            })
            .replace(".", "");
    } catch {
        return iso;
    }
}
