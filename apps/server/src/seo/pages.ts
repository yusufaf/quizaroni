import type { PublicStudyset } from '../public/views';

// Ported from apps/web/netlify/edge-functions (og-meta.ts, sitemap.ts),
// which serve these on the hosted instance today.

// The web shell is built for the hosted instance and names it in its
// canonical and OG tags; a self-host instance names itself instead.
export const HOSTED_ORIGIN = 'https://quizaroni.yusufaf.dev';

export const SITEMAP_MAX_SETS = 49_999;

const escapeHtml = (value: string): string =>
    value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

const escapeXml = (value: string): string =>
    escapeHtml(value).replace(/'/g, '&apos;');

// Function replacements throughout, so `$&` or `$'` in a title or an origin
// are inserted literally rather than read as replacement patterns.
const replaceTag = (html: string, regex: RegExp, replacement: string): string =>
    regex.test(html) ? html.replace(regex, () => replacement) : html;

export function rebrandShell(html: string, origin: string): string {
    const safe = escapeHtml(origin);
    return html.replaceAll(HOSTED_ORIGIN, () => safe);
}

const addNoindex = (html: string): string =>
    html.replace('</head>', () => '<meta name="robots" content="noindex" />\n</head>');

// Drops the shell's canonical/OG/Twitter tags, which all name the home page.
const stripIdentityTags = (html: string): string =>
    html
        .replace(/\s*<link\s+rel="canonical"[^>]*>/g, '')
        .replace(/\s*<meta\s+(?:property="og:|name="twitter:)[^>]*>/g, '');

// Per-set title, description, canonical and OG/Twitter tags for /view/:id.
// A set that isn't listed gets the shell, marked noindex and stripped of its
// identity tags, so a private or hidden set says nothing about itself.
export function renderSetShell(
    html: string,
    set: PublicStudyset | null,
    o: { origin: string; studysetUUID: string }
): { html: string; indexable: boolean } {
    if (!set) {
        return { html: addNoindex(stripIdentityTags(html)), indexable: false };
    }
    if (!set.title) return { html, indexable: true };

    const origin = escapeHtml(o.origin);
    const title = escapeHtml(set.title);
    const cardCount = set.cards.length;
    const author = set.username ? ` by ${set.username}` : '';
    const description = escapeHtml(
        set.description.trim() ||
            `${cardCount} flashcard${cardCount === 1 ? '' : 's'}${author} — study free on Quizaroni.`
    );
    const pageTitle = `${title} · Quizaroni`;
    const canonical = `${origin}/view/${o.studysetUUID}`;
    const image = `${origin}/icon-512x512.png`;

    const tags: [RegExp, string][] = [
        [/<title>[\s\S]*?<\/title>/, `<title>${pageTitle}</title>`],
        [
            /<meta\s+name="description"[^>]*>/,
            `<meta name="description" content="${description}" />`,
        ],
        [
            /<link\s+rel="canonical"[^>]*>/,
            `<link rel="canonical" href="${canonical}" />`,
        ],
        [
            /<meta\s+property="og:type"[^>]*>/,
            `<meta property="og:type" content="article" />`,
        ],
        [
            /<meta\s+property="og:url"[^>]*>/,
            `<meta property="og:url" content="${canonical}" />`,
        ],
        [
            /<meta\s+property="og:title"[^>]*>/,
            `<meta property="og:title" content="${pageTitle}" />`,
        ],
        [
            /<meta\s+property="og:description"[^>]*>/,
            `<meta property="og:description" content="${description}" />`,
        ],
        [
            /<meta\s+name="twitter:title"[^>]*>/,
            `<meta name="twitter:title" content="${pageTitle}" />`,
        ],
        [
            /<meta\s+name="twitter:description"[^>]*>/,
            `<meta name="twitter:description" content="${description}" />`,
        ],
        // The shell's large image is a landing-page capture; set pages get
        // the square app icon and a small summary card instead.
        [
            /<meta\s+property="og:image"[^>]*>/,
            `<meta property="og:image" content="${image}" />`,
        ],
        [
            /<meta\s+property="og:image:width"[^>]*>/,
            `<meta property="og:image:width" content="512" />`,
        ],
        [
            /<meta\s+property="og:image:height"[^>]*>/,
            `<meta property="og:image:height" content="512" />`,
        ],
        [
            /<meta\s+property="og:image:alt"[^>]*>/,
            `<meta property="og:image:alt" content="Quizaroni flashcard set: ${title}" />`,
        ],
        [
            /<meta\s+name="twitter:card"[^>]*>/,
            `<meta name="twitter:card" content="summary" />`,
        ],
        [
            /<meta\s+name="twitter:image"[^>]*>/,
            `<meta name="twitter:image" content="${image}" />`,
        ],
    ];
    let out = html;
    for (const [regex, replacement] of tags) {
        out = replaceTag(out, regex, replacement);
    }
    return { html: out, indexable: true };
}

export function sitemapXml(
    origin: string,
    sets: { studysetUUID: string; updatedAt: Date }[]
): string {
    const urls = [`  <url>\n    <loc>${escapeXml(origin)}/</loc>\n  </url>`];
    for (const set of sets) {
        const loc = `${origin}/view/${encodeURIComponent(set.studysetUUID)}`;
        urls.push(
            `  <url>\n    <loc>${escapeXml(loc)}</loc>\n    <lastmod>${set.updatedAt.toISOString()}</lastmod>\n  </url>`
        );
    }
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`;
}

export function robotsTxt(origin: string): string {
    return `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;
}
