// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vite-plus/test';
import {
    deleteApiKeysOf,
    getApiKey,
    hasApiKey,
    saveApiKey,
} from './aiKeyStorage';

const STORAGE_KEY = 'quizaroni-ai-keys';

beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(window, 'crypto', {
        value: globalThis.crypto,
        configurable: true,
    });
});

describe('deleteApiKeysOf', () => {
    it("removes only the entries that user's id decrypts", async () => {
        await saveApiKey('openai', 'sk-a', 'user-a');
        await saveApiKey('anthropic', 'sk-b', 'user-b');

        await deleteApiKeysOf('user-a');

        expect(hasApiKey('openai')).toBe(false);
        expect(hasApiKey('anthropic')).toBe(true);
        expect(await getApiKey('anthropic', 'user-b')).toBe('sk-b');
    });

    it('removes every entry that user saved', async () => {
        await saveApiKey('openai', 'sk-a', 'user-a');
        await saveApiKey('google', 'sk-g', 'user-a');

        await deleteApiKeysOf('user-a');

        expect(localStorage.getItem(STORAGE_KEY)).toBe('{}');
    });

    it('does nothing and does not throw with no stored keys', async () => {
        await expect(deleteApiKeysOf('user-a')).resolves.toBeUndefined();
    });

    it('does not throw on corrupt storage and leaves it alone', async () => {
        localStorage.setItem(STORAGE_KEY, 'not json');
        await expect(deleteApiKeysOf('user-a')).resolves.toBeUndefined();
        expect(localStorage.getItem(STORAGE_KEY)).toBe('not json');
    });

    it('keeps entries it cannot decrypt', async () => {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ openai: { iv: [1], data: [2] } })
        );
        await deleteApiKeysOf('user-a');
        expect(hasApiKey('openai')).toBe(true);
    });
});
