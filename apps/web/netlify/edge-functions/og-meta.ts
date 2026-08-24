import type { Context } from '@netlify/edge-functions';

// Netlify Edge Functions run on Deno, not Node. This directory is outside
// tsconfig.json's `include`, so it gets no ambient Deno types — declare just
// the slice of the API this file actually calls.
declare const Deno: { env: { get(key: string): string | undefined } };

/**
 * Per-set Open Graph / Twitter meta for public study sets.
 *
 * Quizaroni is a client-rendered SPA: the HTML that crawlers and social
 * scrapers receive is a static shell with generic meta tags, so a shared
 * `/view/:id` link previews as the generic app everywhere. This edge function
 * runs on `/view/*`, fetches the (public) set from the API, and rewrites the
 * <title> + OG/Twitter/description/canonical tags in the shell before it is
 * served — so link unfurls and search snippets reflect the actual set.
 *
 * The set is fetched from the same unauthenticated endpoint the client uses
 * (`/api/public/studyset/:id`), which returns 404 for private/nonexistent sets;
 * in that case we serve the shell unchanged.
 */

const escapeHtml = (value: string): string =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

/** Replaces a tag matched by `regex` if present; otherwise leaves html as-is. */
const replaceTag = (html: string, regex: RegExp, replacement: string): string =>
    regex.test(html) ? html.replace(regex, replacement) : html;

type PublicSet = {
    title?: string;
    description?: string;
    username?: string;
    categories?: string[];
    labels?: string[];
    cards?: unknown[];
};

export default async (request: Request, context: Context) => {
    // Read lazily inside the handler, not at module top level: Netlify's
    // build-time edge-function bundler evaluates this module to extract its
    // config before deploy, when site env vars aren't injected yet — a
    // top-level throw here fails the build itself, not just a bad request.
    // The deployed AWS API Gateway (matches BASE_API_URL in the web app),
    // set as a Netlify site env var, visible to edge functions regardless of
    // the VITE_ prefix. We call the API directly rather than through
    // netlify.toml's redirects — there is no `/api/*` proxy to rely on.
    const API_BASE = Deno.env.get('API_BASE_URL');
    if (!API_BASE) {
        throw new Error('API_BASE_URL env var is not set');
    }

    const response = await context.next();

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html')) {
        return response;
    }

    const url = new URL(request.url);
    const id = url.pathname.split('/view/')[1]?.split('/')[0] ?? '';
    if (!id) {
        return response;
    }

    let set: PublicSet | null = null;
    try {
        const apiResponse = await fetch(
            `${API_BASE}/public/studyset/${encodeURIComponent(id)}`,
            { headers: { accept: 'application/json' } }
        );
        if (apiResponse.ok) {
            const payload = await apiResponse.json();
            set = payload?.studyset ?? null;
        }
    } catch {
        // Network/API failure — fall through and serve the default shell.
    }

    if (!set || !set.title) {
        return response;
    }

    const title = escapeHtml(set.title);
    const cardCount = Array.isArray(set.cards) ? set.cards.length : 0;
    const subject = set.categories?.[0] ?? set.labels?.[0] ?? '';
    const author = set.username ? ` by ${set.username}` : '';
    const description = escapeHtml(
        (set.description && set.description.trim()) ||
            `${cardCount} flashcard${cardCount === 1 ? '' : 's'}${
                subject ? ` on ${subject}` : ''
            }${author} — study free on Quizaroni.`
    );
    const pageTitle = `${title} · Quizaroni`;
    const canonical = `${url.origin}/view/${id}`;

    let html = await response.text();

    html = replaceTag(
        html,
        /<title>[\s\S]*?<\/title>/,
        `<title>${pageTitle}</title>`
    );
    html = replaceTag(
        html,
        /<meta\s+name="description"[^>]*>/,
        `<meta name="description" content="${description}" />`
    );
    html = replaceTag(
        html,
        /<link\s+rel="canonical"[^>]*>/,
        `<link rel="canonical" href="${canonical}" />`
    );
    html = replaceTag(
        html,
        /<meta\s+property="og:type"[^>]*>/,
        `<meta property="og:type" content="article" />`
    );
    html = replaceTag(
        html,
        /<meta\s+property="og:url"[^>]*>/,
        `<meta property="og:url" content="${canonical}" />`
    );
    html = replaceTag(
        html,
        /<meta\s+property="og:title"[^>]*>/,
        `<meta property="og:title" content="${pageTitle}" />`
    );
    html = replaceTag(
        html,
        /<meta\s+property="og:description"[^>]*>/,
        `<meta property="og:description" content="${description}" />`
    );
    html = replaceTag(
        html,
        /<meta\s+name="twitter:title"[^>]*>/,
        `<meta name="twitter:title" content="${pageTitle}" />`
    );
    html = replaceTag(
        html,
        /<meta\s+name="twitter:description"[^>]*>/,
        `<meta name="twitter:description" content="${description}" />`
    );

    const headers = new Headers(response.headers);
    headers.set('content-type', 'text/html; charset=utf-8');
    // Let Netlify's CDN cache the rewritten shell briefly so a viral link does
    // not re-hit the API on every scrape, while edits still surface quickly.
    headers.set('cache-control', 'public, max-age=0, s-maxage=300');
    headers.delete('content-length');

    return new Response(html, {
        status: response.status,
        headers,
    });
};

// The `/view/*` path binding is declared in netlify.toml ([[edge_functions]])
// so all routing lives in one place.
