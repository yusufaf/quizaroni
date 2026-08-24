import type { Context } from '@netlify/edge-functions';

// Netlify Edge Functions run on Deno, not Node. This directory is outside
// tsconfig.json's `include`, so it gets no ambient Deno types — declare just
// the slice of the API this file actually calls.
declare const Deno: { env: { get(key: string): string | undefined } };

/**
 * Dynamic XML sitemap of all public study sets.
 *
 * Google indexes the empty SPA shell today. Pairing this sitemap (linked from
 * robots.txt) with the og-meta edge function — which injects real per-set
 * title/description into `/view/:id` — makes public sets discoverable and gives
 * crawlers a snippet worth indexing. The set list comes from the same
 * unauthenticated API the app uses.
 */

const escapeXml = (value: string): string =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');

type PublicSummary = {
    studysetUUID?: string;
    updatedAt?: string;
};

export default async (request: Request, _context: Context) => {
    // Read lazily inside the handler — see the note in og-meta.ts about
    // Netlify's build-time bundling pass running before env vars exist.
    // Deployed AWS API Gateway (matches BASE_API_URL in the web app).
    const API_BASE = Deno.env.get('API_BASE_URL');
    if (!API_BASE) {
        throw new Error('API_BASE_URL env var is not set');
    }

    const origin = new URL(request.url).origin;

    let studysets: PublicSummary[] = [];
    try {
        const apiResponse = await fetch(`${API_BASE}/public/studysets`, {
            headers: { accept: 'application/json' },
        });
        if (apiResponse.ok) {
            const payload = await apiResponse.json();
            studysets = Array.isArray(payload?.studysets)
                ? payload.studysets
                : [];
        }
    } catch {
        // API failure — still return a valid sitemap with the landing page so
        // crawlers get a well-formed document rather than an error.
    }

    const urls: string[] = [
        `  <url>\n    <loc>${escapeXml(origin)}/</loc>\n  </url>`,
    ];

    for (const set of studysets) {
        if (!set.studysetUUID) continue;
        const loc = `${origin}/view/${encodeURIComponent(set.studysetUUID)}`;
        const lastmod = set.updatedAt
            ? `\n    <lastmod>${escapeXml(set.updatedAt)}</lastmod>`
            : '';
        urls.push(
            `  <url>\n    <loc>${escapeXml(loc)}</loc>${lastmod}\n  </url>`
        );
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join(
        '\n'
    )}\n</urlset>\n`;

    return new Response(xml, {
        headers: {
            'content-type': 'application/xml; charset=utf-8',
            // Rebuild at most hourly at the edge; cheap and fresh enough for a
            // sitemap crawlers re-fetch on their own schedule.
            'cache-control': 'public, max-age=0, s-maxage=3600',
        },
    });
};
