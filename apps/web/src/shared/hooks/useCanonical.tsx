import { useEffect } from 'react';

// index.html ships one canonical naming the home page, and only /view/* is
// rewritten server-side (netlify/edge-functions/og-meta.ts). Without this,
// every other route claims to be "/" and fails Lighthouse's canonical audit.
const isIndexable = (pathname: string) =>
    pathname === '/' ||
    pathname === '/explore' ||
    /^\/view\/[^/]+$/.test(pathname);

export default function useCanonical(pathname: string) {
    useEffect(() => {
        let link = document.head.querySelector<HTMLLinkElement>(
            'link[rel="canonical"]'
        );
        // og-meta marks private or missing sets noindex and strips the
        // canonical; don't put one back. That meta outlives SPA navigation,
        // so it only speaks for the /view page it was served with.
        const noindexSet =
            pathname.startsWith('/view/') &&
            document.head.querySelector(
                'meta[name="robots"][content*="noindex"]'
            );

        if (!isIndexable(pathname) || noindexSet) {
            link?.remove();
            return;
        }
        if (!link) {
            link = document.createElement('link');
            link.rel = 'canonical';
            document.head.appendChild(link);
        }
        link.href = `${window.location.origin}${pathname}`;
    }, [pathname]);
}
