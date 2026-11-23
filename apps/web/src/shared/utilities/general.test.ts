import { describe, expect, it } from 'vite-plus/test';
import { DATE_FORMATS } from 'shared/constants';
import { formatDateUsingPreferred } from './general';

describe('formatDateUsingPreferred', () => {
    it.each([undefined, '', 'not a date'])(
        'returns an empty string for %j instead of throwing',
        (value) => {
            for (const format of Object.values(DATE_FORMATS)) {
                expect(
                    formatDateUsingPreferred(value as unknown as string, format)
                ).toBe('');
            }
        }
    );

    it('formats a valid timestamp as ISO', () => {
        expect(
            formatDateUsingPreferred(
                '2026-10-27T05:49:52.225Z',
                DATE_FORMATS.ISO_8601
            ).startsWith('2026-10-27 ')
        ).toBe(true);
    });
});
