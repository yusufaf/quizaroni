import { afterEach, describe, expect, it, vi } from 'vite-plus/test';
import { randomUUID } from './uuid';

const V4 =
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

// Plain-HTTP origins expose getRandomValues but not randomUUID (#381).
const stubInsecureCrypto = (fill?: number) => {
    const real = globalThis.crypto;
    vi.stubGlobal('crypto', {
        getRandomValues: (array: Uint8Array<ArrayBuffer>) =>
            fill === undefined ? real.getRandomValues(array) : array.fill(fill),
    });
};

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe('randomUUID', () => {
    it('uses the native randomUUID when the browser has it', () => {
        vi.spyOn(crypto, 'randomUUID').mockReturnValue(
            '11111111-1111-4111-8111-111111111111'
        );
        expect(randomUUID()).toBe('11111111-1111-4111-8111-111111111111');
    });

    it('builds lowercase v4 UUIDs without the native randomUUID', () => {
        stubInsecureCrypto();
        const ids = Array.from({ length: 1000 }, () => randomUUID());
        for (const id of ids) expect(id).toMatch(V4);
        expect(new Set(ids).size).toBe(1000);
    });

    it('sets the version and variant bits', () => {
        stubInsecureCrypto(0xff);
        expect(randomUUID()).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
        stubInsecureCrypto(0x00);
        expect(randomUUID()).toBe('00000000-0000-4000-8000-000000000000');
    });

    it('lets shared/constants load without the native randomUUID (#381)', async () => {
        stubInsecureCrypto();
        vi.resetModules();
        const { EMPTY_CARD } = await import('shared/constants');
        expect(EMPTY_CARD.cardUUID).toMatch(V4);
    });
});
