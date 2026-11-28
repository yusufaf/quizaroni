import { describe, expect, it } from 'vite-plus/test';

const sources = import.meta.glob<string>('/src/**/*.{ts,tsx}', {
    query: '?raw',
    import: 'default',
    eager: true,
});

// Quizaroni orange (#ffa000 and its shades, with or without an alpha byte)
// and the near-oranges it replaced, in comma or CSS4 space syntax.
const BRAND =
    /\b255[,\s]+1(52|60|65)[,\s]+0\b|#ff(a000|9800|a500|8f00|d149)(?:[0-9a-f]{2})?\b|#c67100(?:[0-9a-f]{2})?\b/i;

// The theme itself and the Landing page may use brand literals anywhere.
const ALLOWED_DIRS = [/^\/src\/shared\/theme\//, /^\/src\/views\/Landing\//];

// Single lines kept on purpose: the confetti and identity colours in
// Matching and Results. Keyed by path and trimmed line, not line number.
const KEPT = [
    "/src/views/Study/MatchingStudy.tsx: '#FFA000',",
    "/src/views/Study/shared/StudyResults.tsx: colors: ['#FFA000', '#FF6B6B', '#4ECDC4', '#FFD93D', '#95E1D3'],",
    "/src/views/Study/shared/StudyResults.tsx: backgroundColor: 'rgba(255, 160, 0, 0.1)',",
];

const hits = () =>
    Object.entries(sources)
        .filter(([path]) => !ALLOWED_DIRS.some((dir) => dir.test(path)))
        .flatMap(([path, source]) =>
            source.split('\n').flatMap((line, i) =>
                BRAND.test(line)
                    ? [
                          {
                              key: `${path}: ${line.trim()}`,
                              at: `${path}:${i + 1}: ${line.trim()}`,
                          },
                      ]
                    : []
            )
        );

describe('brand orange literals', () => {
    it('scans the app sources', () => {
        expect(Object.keys(sources)).toContain(
            '/src/views/NavBar/NavStyles.tsx'
        );
        expect(Object.keys(sources).length).toBeGreaterThan(300);
    });

    it.each([
        'rgba(255,160,0,0.1)',
        'rgba(255, 152, 0, 0.12)',
        'rgba(255, 165, 0, 0.3)',
        'rgb(255 160 0 / 0.2)',
        '#FFA000',
        '#ffa00033',
        '#ff9800',
        '#c67100',
    ])('matches %s', (value) => {
        expect(BRAND.test(value)).toBe(true);
    });

    it.each([
        '#FFB74D',
        'rgba(255, 107, 107, 0.1)',
        'rgba(25, 118, 210, 0.08)',
    ])('ignores %s', (value) => {
        expect(BRAND.test(value)).toBe(false);
    });

    it('only the theme and kept identity colours use brand literals', () => {
        expect(
            hits()
                .filter((h) => !KEPT.includes(h.key))
                .map((h) => h.at)
        ).toEqual([]);
    });

    it('each kept identity colour appears exactly once', () => {
        expect(
            hits()
                .filter((h) => KEPT.includes(h.key))
                .map((h) => h.key)
                .sort()
        ).toEqual([...KEPT].sort());
    });
});
