// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { DATE_FORMATS } from 'shared/constants';
import {
    downloadFile,
    downloadObjectAsJSON,
    formatDateUsingPreferred,
} from './general';

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

describe('downloadFile', () => {
    afterEach(() => {
        vi.useRealTimers();
        vi.restoreAllMocks();
    });

    const stubUrl = () => {
        const create = vi.fn(() => 'blob:test-url');
        const revoke = vi.fn();
        vi.stubGlobal('URL', { createObjectURL: create, revokeObjectURL: revoke });
        const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
        return { create, revoke, click };
    };

    it('clicks a temporary link and revokes the object URL afterwards', () => {
        vi.useFakeTimers();
        const { create, revoke, click } = stubUrl();

        downloadFile('a,b', 'cards.csv', 'text/csv');

        expect(create).toHaveBeenCalledTimes(1);
        expect(click).toHaveBeenCalledTimes(1);
        vi.runAllTimers();
        expect(revoke).toHaveBeenCalledWith('blob:test-url');
    });

    it('downloadObjectAsJSON goes through the same helper and also revokes', () => {
        vi.useFakeTimers();
        const { revoke } = stubUrl();

        downloadObjectAsJSON({ a: 1 }, 'data.json');

        vi.runAllTimers();
        expect(revoke).toHaveBeenCalledTimes(1);
    });
});
