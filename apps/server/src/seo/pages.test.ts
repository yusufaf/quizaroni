import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import type { PublicStudyset } from '../public/views';
import { WEB_SHELL_PATH } from '../testing/shell-fixture';
import {
    HOSTED_ORIGIN,
    rebrandShell,
    renderSetShell,
    robotsTxt,
    sitemapXml,
} from './pages';

const SHELL = readFileSync(WEB_SHELL_PATH, 'utf8');
const ORIGIN = 'https://quiz.example.test';
const ID = 'a'.repeat(32);

const set = (o: Partial<PublicStudyset> = {}): PublicStudyset => ({
    title: 'Cells',
    description: 'All about cells',
    username: 'ada',
    subject: 'science',
    publishedAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
    cards: [{ term: 't', definition: 'd', files: [] }],
    ...o,
});

const render = (s: PublicStudyset | null, origin = ORIGIN) =>
    renderSetShell(rebrandShell(SHELL, origin), s, {
        origin,
        studysetUUID: ID,
    });

const content = (html: string, attr: string): string | undefined =>
    html.match(new RegExp(`<meta\\s+${attr}\\s+content="([^"]*)"`))?.[1];

describe('the real web shell', () => {
    test('still has every tag the rewrites expect', () => {
        for (const tag of [
            /<title>/,
            /<meta\s+name="description"/,
            /<link\s+rel="canonical"/,
            /<meta\s+property="og:url"/,
            /<meta\s+property="og:title"/,
            /<meta\s+property="og:description"/,
            /<meta\s+property="og:image"/,
            /<meta\s+name="twitter:card"/,
            /<meta\s+name="twitter:title"/,
            /<meta\s+name="twitter:image"/,
        ]) {
            expect(SHELL).toMatch(tag);
        }
        expect(SHELL).toContain(HOSTED_ORIGIN);
    });
});

describe('rebrandShell', () => {
    test('names this instance instead of the hosted one', () => {
        const html = rebrandShell(SHELL, ORIGIN);
        expect(html).not.toContain(HOSTED_ORIGIN);
        expect(html).toContain(`<link rel="canonical" href="${ORIGIN}/" />`);
    });

    test('escapes the origin and inserts $ patterns literally', () => {
        const html = rebrandShell(SHELL, 'http://a"b$&.test');
        expect(html).toContain('http://a&quot;b$&amp;.test/');
        expect(html).not.toContain('a"b');
    });
});

describe('renderSetShell', () => {
    test('a listed set gets its own title, canonical and OG tags', () => {
        const { html, indexable } = render(set());
        expect(indexable).toBe(true);
        expect(html).toContain('<title>Cells · Quizaroni</title>');
        expect(html).toContain(
            `<link rel="canonical" href="${ORIGIN}/view/${ID}" />`
        );
        expect(content(html, 'property="og:url"')).toBe(`${ORIGIN}/view/${ID}`);
        expect(content(html, 'property="og:type"')).toBe('article');
        expect(content(html, 'property="og:description"')).toBe(
            'All about cells'
        );
        expect(content(html, 'property="og:image"')).toBe(
            `${ORIGIN}/icon-512x512.png`
        );
        expect(content(html, 'name="twitter:card"')).toBe('summary');
        expect(html).not.toContain(HOSTED_ORIGIN);
        expect(html).not.toContain('name="robots"');
    });

    test('escapes the title and description', () => {
        const { html } = render(
            set({ title: '<b>"x"</b> $&', description: 'a & <i>b</i>' })
        );
        expect(html).toContain(
            '<title>&lt;b&gt;&quot;x&quot;&lt;/b&gt; $&amp; · Quizaroni</title>'
        );
        expect(content(html, 'name="description"')).toBe(
            'a &amp; &lt;i&gt;b&lt;/i&gt;'
        );
        expect(html).not.toContain('<b>');
    });

    test('a blank description falls back to the card count and author', () => {
        const one = render(set({ description: '  ' })).html;
        expect(content(one, 'name="description"')).toBe(
            '1 flashcard by ada — study free on Quizaroni.'
        );
        const many = render(
            set({
                description: '',
                username: '',
                cards: [
                    { term: 'a', definition: 'b', files: [] },
                    { term: 'c', definition: 'd', files: [] },
                ],
            })
        ).html;
        expect(content(many, 'name="description"')).toBe(
            '2 flashcards — study free on Quizaroni.'
        );
    });

    test('an unlisted set gets a noindex shell that names nothing', () => {
        const { html, indexable } = render(null);
        expect(indexable).toBe(false);
        expect(html).toContain('<meta name="robots" content="noindex" />');
        expect(html).not.toMatch(/rel="canonical"/);
        expect(html).not.toMatch(/property="og:/);
        expect(html).not.toMatch(/name="twitter:/);
        expect(html).not.toContain(ID);
    });
});

describe('sitemap and robots', () => {
    test('lists the home page then each set with its lastmod', () => {
        const xml = sitemapXml(ORIGIN, [
            { studysetUUID: ID, updatedAt: new Date('2026-03-04T05:06:07Z') },
        ]);
        expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(
            true
        );
        const locs = [...xml.matchAll(/<loc>([^<]*)<\/loc>/g)].map((m) => m[1]);
        expect(locs).toEqual([`${ORIGIN}/`, `${ORIGIN}/view/${ID}`]);
        expect(xml).toContain('<lastmod>2026-03-04T05:06:07.000Z</lastmod>');
    });

    test('escapes the origin', () => {
        const xml = sitemapXml("http://a'b&c.test", []);
        expect(xml).toContain('<loc>http://a&apos;b&amp;c.test/</loc>');
    });

    test('robots points at the sitemap', () => {
        expect(robotsTxt(ORIGIN)).toBe(
            `User-agent: *\nAllow: /\n\nSitemap: ${ORIGIN}/sitemap.xml\n`
        );
    });
});
