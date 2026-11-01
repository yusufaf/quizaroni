import { useEffect, useRef } from 'react';
import { SITE_ORIGIN } from 'shared/constants';

// index.html ships one canonical naming the home page, and only /view/* is
// rewritten server-side (netlify/edge-functions/og-meta.ts). Without this,
// every other route claims to be "/" and fails Lighthouse's canonical audit.
const isIndexable = (path: string) =>
    path === '/' || path === '/explore' || /^\/view\/[^/]+$/.test(path);

// React Router serves /explore/ and /explore alike; name one of them.
const normalize = (pathname: string) =>
    pathname.length > 1 ? pathname.replace(/\/+$/, '') || '/' : pathname;

export default function useCanonical(pathname: string) {
    // The first path this hook sees is the page the server sent, the only
    // one og-meta's noindex meta can speak for: it outlives SPA navigation.
    const servedPath = useRef(pathname);

    useEffect(() => {
        const path = normalize(pathname);
        let link = document.head.querySelector<HTMLLinkElement>(
            'link[rel="canonical"]'
        );
        // og-meta marks a private or missing set noindex and strips the
        // canonical; don't put one back.
        const noindexSet =
            pathname === servedPath.current &&
            document.head.querySelector(
                'meta[name="robots"][content*="noindex"]'
            );

        if (!isIndexable(path) || noindexSet) {
            link?.remove();
            return;
        }
        if (!link) {
            link = document.createElement('link');
            link.rel = 'canonical';
            document.head.appendChild(link);
        }
        link.href = `${SITE_ORIGIN}${path}`;
    }, [pathname]);
}
