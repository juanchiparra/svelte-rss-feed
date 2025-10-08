export function masonry(node: HTMLElement) {
    const layout = () => {
        const styles = getComputedStyle(node);
        const gap = parseFloat(styles.rowGap || "8");
        const row = parseFloat(styles.gridAutoRows || "8");
        const items = node.querySelectorAll<HTMLElement>(".card");
        items.forEach((item) => {
            item.style.gridRowEnd = "span 1";
            const h = item.getBoundingClientRect().height;
            const span = Math.max(1, Math.ceil((h + gap) / (row + gap)));
            item.style.gridRowEnd = `span ${span}`;
        });
    };
    const onResize = () => layout();
    window.addEventListener("resize", onResize);
    const imgs = node.querySelectorAll<HTMLImageElement>("img");
    imgs.forEach((img) => {
        if (!img.complete) {
            img.addEventListener("load", onResize);
            img.addEventListener("error", onResize);
        }
    });
    const ro = new ResizeObserver(() => layout());
    const observeCards = () =>
        node
            .querySelectorAll<HTMLElement>(".card")
            .forEach((el) => ro.observe(el));
    observeCards();
    const mo = new MutationObserver(() => {
        ro.disconnect();
        observeCards();
        layout();
    });
    mo.observe(node, { childList: true, subtree: true });
    queueMicrotask(layout);
    return {
        destroy() {
            window.removeEventListener("resize", onResize);
            imgs.forEach((img) => {
                img.removeEventListener("load", onResize);
                img.removeEventListener("error", onResize);
            });
            ro.disconnect();
            mo.disconnect();
        },
    };
}

export default masonry;
