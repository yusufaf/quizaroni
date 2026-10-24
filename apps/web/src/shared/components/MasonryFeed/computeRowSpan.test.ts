import { describe, it, expect } from 'vite-plus/test';
import { computeRowSpan, countGridColumns } from './computeRowSpan';

describe('computeRowSpan', () => {
    it('rounds up to whole rows with no gap', () => {
        expect(computeRowSpan({ height: 100, rowUnit: 8, rowGap: 0 })).toBe(13);
    });

    it('fits an exact multiple without an extra row', () => {
        expect(computeRowSpan({ height: 96, rowUnit: 8, rowGap: 0 })).toBe(12);
    });

    it('counts the gaps between spanned rows', () => {
        // 5 rows cover 5 * 8 + 4 * 16 = 104 >= 100; 4 rows cover only 80.
        expect(computeRowSpan({ height: 100, rowUnit: 8, rowGap: 16 })).toBe(5);
    });

    it('never spans fewer than one row', () => {
        expect(computeRowSpan({ height: 0, rowUnit: 8, rowGap: 0 })).toBe(1);
    });

    it('falls back to one row for unusable input', () => {
        expect(computeRowSpan({ height: NaN, rowUnit: 8, rowGap: 0 })).toBe(1);
        expect(computeRowSpan({ height: 100, rowUnit: 0, rowGap: 0 })).toBe(1);
        expect(
            computeRowSpan({ height: 100, rowUnit: Infinity, rowGap: 0 })
        ).toBe(1);
    });
});

describe('countGridColumns', () => {
    it('counts resolved tracks', () => {
        expect(countGridColumns('288px 288px')).toBe(2);
        expect(countGridColumns(' 288px  288px 288px ')).toBe(3);
        expect(countGridColumns('288px')).toBe(1);
    });

    it('treats unresolved or empty values as one column', () => {
        expect(countGridColumns('')).toBe(1);
        expect(countGridColumns('none')).toBe(1);
        expect(
            countGridColumns('repeat(auto-fill, minmax(min(18rem, 100%), 1fr))')
        ).toBe(1);
    });
});
