// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vite-plus/test';
import {
    applyPrefsPatch,
    clearRedundantOverride,
    DEFAULT_THEME_PREFS,
    defaultStoredTheme,
    effectiveMode,
    flatten,
    LEGACY_THEME_STORAGE_KEY,
    markSentSynced,
    mergeServerPrefs,
    readStoredTheme,
    resetSyncState,
    resolveAccent,
    resolveMode,
    resolveThemeId,
    revertSent,
    THEME_STORAGE_KEY,
    toFlatPrefs,
    toggleModeOverride,
    unflatten,
    writeStoredTheme,
    type StoredTheme,
    type ThemePrefs,
} from './prefs';

const ACCENT_KEY = 'themeAccents.quizaroni-dark' as const;

const signedIn = (
    userId = 'A',
    over: Partial<StoredTheme> = {}
): StoredTheme => ({
    ...defaultStoredTheme(),
    sync: { userId, synced: {}, pending: {} },
    ...over,
});

// A device that synced dark mode and an accent with account A.
const syncedWithA = (): StoredTheme => {
    const prefs: ThemePrefs = {
        ...DEFAULT_THEME_PREFS,
        themeMode: 'dark',
        themeAccents: { 'quizaroni-dark': 'orange' },
    };
    return {
        ...defaultStoredTheme(),
        prefs,
        sync: {
            userId: 'A',
            synced: { themeMode: 'dark', [ACCENT_KEY]: 'orange' },
            pending: {},
        },
    };
};

beforeEach(() => {
    localStorage.clear();
});

describe('storage', () => {
    it('defaults when the store is empty', () => {
        const s = readStoredTheme();
        expect(s.prefs).toEqual(DEFAULT_THEME_PREFS);
        expect(s.modeOverride).toBeNull();
        expect(s.sync).toEqual({ userId: null, synced: {}, pending: {} });
    });

    it('removes the legacy appTheme key and ignores it on read', () => {
        localStorage.setItem(LEGACY_THEME_STORAGE_KEY, 'dark');
        expect(readStoredTheme().prefs.themeMode).toBe('system');
        writeStoredTheme(defaultStoredTheme());
        expect(localStorage.getItem(LEGACY_THEME_STORAGE_KEY)).toBeNull();
    });

    it('defaults on a corrupt blob or another version', () => {
        localStorage.setItem(THEME_STORAGE_KEY, '{not json');
        expect(readStoredTheme()).toEqual(defaultStoredTheme());
        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ v: 2 }));
        expect(readStoredTheme()).toEqual(defaultStoredTheme());
    });

    it('falls back field by field on invalid values', () => {
        localStorage.setItem(
            THEME_STORAGE_KEY,
            JSON.stringify({
                v: 1,
                prefs: {
                    themeMode: 'sepia',
                    lightTheme: 'quizaroni-dark',
                    darkTheme: 'quizaroni-dark',
                    themeAccents: { nope: 'x', 'quizaroni-dark': 'orange' },
                },
                modeOverride: 'blue',
                sync: { userId: 7, synced: { themeMode: 'bad' }, pending: [] },
            })
        );
        const s = readStoredTheme();
        expect(s.prefs).toEqual({
            ...DEFAULT_THEME_PREFS,
            themeAccents: { 'quizaroni-dark': 'orange' },
        });
        expect(s.modeOverride).toBeNull();
        expect(s.sync).toEqual({ userId: null, synced: {}, pending: {} });
    });

    it('stores the paint colours for both modes', () => {
        writeStoredTheme(defaultStoredTheme());
        const raw = JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) ?? '{}');
        expect(raw.paint).toEqual({
            light: { bg: '#f5f5f7', bar: '#ffffff' },
            dark: { bg: '#121212', bar: '#1e1e1e' },
        });
    });
});

describe('resolution', () => {
    it('falls back for an unknown id and a dark id in the light slot', () => {
        const prefs = {
            ...DEFAULT_THEME_PREFS,
            lightTheme: 'quizaroni-dark',
            darkTheme: 'nope',
        } as unknown as ThemePrefs;
        expect(resolveThemeId(prefs, 'light')).toBe('quizaroni-light');
        expect(resolveThemeId(prefs, 'dark')).toBe('quizaroni-dark');
    });

    it('falls back to the default accent for an unknown accent', () => {
        const prefs: ThemePrefs = {
            ...DEFAULT_THEME_PREFS,
            themeAccents: { 'quizaroni-light': 'teal' },
        };
        expect(resolveAccent(prefs, 'quizaroni-light')).toBe('orange');
    });

    it('resolves mode, override and toggle', () => {
        const s = defaultStoredTheme();
        expect(resolveMode('system', 'dark')).toBe('dark');
        expect(resolveMode('light', 'dark')).toBe('light');
        const toggled = toggleModeOverride(s, 'light');
        expect(toggled.modeOverride).toBe('dark');
        expect(effectiveMode(toggled, 'light')).toBe('dark');
        expect(toggleModeOverride(toggled, 'light').modeOverride).toBeNull();
        expect(toggled.prefs).toBe(s.prefs);
    });

    it('clears an override made redundant by an OS flip', () => {
        const toggled = toggleModeOverride(defaultStoredTheme(), 'light');
        expect(clearRedundantOverride(toggled, 'dark').modeOverride).toBeNull();
        expect(clearRedundantOverride(toggled, 'light').modeOverride).toBe(
            'dark'
        );
    });
});

describe('applyPrefsPatch', () => {
    it('keeps the other theme accents when merging one', () => {
        const s = {
            ...defaultStoredTheme(),
            prefs: {
                ...DEFAULT_THEME_PREFS,
                themeAccents: { 'quizaroni-light': 'orange' },
            },
        };
        const { next } = applyPrefsPatch(s, {
            themeAccents: { 'quizaroni-dark': 'orange' },
        });
        expect(next.prefs.themeAccents).toEqual({
            'quizaroni-light': 'orange',
            'quizaroni-dark': 'orange',
        });
    });

    it('clears the override on any themeMode patch, even the same value', () => {
        const toggled = toggleModeOverride(defaultStoredTheme(), 'light');
        const { next } = applyPrefsPatch(toggled, { themeMode: 'system' });
        expect(next.modeOverride).toBeNull();
    });

    it('marks nothing pending while signed out', () => {
        const { next, pendingChanged } = applyPrefsPatch(defaultStoredTheme(), {
            themeMode: 'dark',
        });
        expect(pendingChanged).toBe(false);
        expect(next.sync.pending).toEqual({});
        expect(next.prefs.themeMode).toBe('dark');
    });

    it('marks only the changed keys pending while signed in', () => {
        const { next, pendingChanged } = applyPrefsPatch(signedIn(), {
            themeMode: 'dark',
            lightTheme: 'quizaroni-light',
        });
        expect(pendingChanged).toBe(true);
        expect(next.sync.pending).toEqual({ themeMode: 'dark' });
    });
});

describe('reconcileServerPrefs', () => {
    it('takes a server-changed key that is not pending', () => {
        const s = mergeServerPrefs(signedIn(), { themeMode: 'dark' }, 'A');
        expect(s.prefs.themeMode).toBe('dark');
        expect(s.sync.synced.themeMode).toBe('dark');
    });

    it('keeps a pending value over a differing server value', () => {
        const { next } = applyPrefsPatch(signedIn(), { themeMode: 'light' });
        const s = mergeServerPrefs(next, { themeMode: 'dark' }, 'A');
        expect(s.prefs.themeMode).toBe('light');
        expect(s.sync.pending).toEqual({ themeMode: 'light' });
    });

    it('clears pending when the server already has the value', () => {
        const { next } = applyPrefsPatch(signedIn(), { themeMode: 'dark' });
        const s = mergeServerPrefs(next, { themeMode: 'dark' }, 'A');
        expect(s.sync.pending).toEqual({});
        expect(s.sync.synced.themeMode).toBe('dark');
    });

    it('ignores keys the server lacks', () => {
        const start = {
            ...signedIn(),
            prefs: { ...DEFAULT_THEME_PREFS, themeMode: 'dark' as const },
        };
        const s = mergeServerPrefs(start, {}, 'A');
        expect(s.prefs.themeMode).toBe('dark');
        expect(s.sync.pending).toEqual({});
    });
});

describe('first sign-in', () => {
    it('lets server keys win and marks them synced', () => {
        const start = {
            ...defaultStoredTheme(),
            prefs: { ...DEFAULT_THEME_PREFS, themeMode: 'light' as const },
        };
        const s = mergeServerPrefs(start, { themeMode: 'dark' }, 'A');
        expect(s.prefs.themeMode).toBe('dark');
        expect(s.sync).toEqual({
            userId: 'A',
            synced: { themeMode: 'dark' },
            pending: {},
        });
    });

    it('uploads non-default local keys the server lacks', () => {
        const start = {
            ...defaultStoredTheme(),
            prefs: {
                ...DEFAULT_THEME_PREFS,
                themeMode: 'dark' as const,
                themeAccents: { 'quizaroni-dark': 'orange' },
            },
        };
        const s = mergeServerPrefs(start, {}, 'A');
        expect(s.sync.pending).toEqual({
            themeMode: 'dark',
            [ACCENT_KEY]: 'orange',
        });
    });

    it('does not upload default local keys', () => {
        const s = mergeServerPrefs(defaultStoredTheme(), {}, 'A');
        expect(s.sync.pending).toEqual({});
    });

    it('resetSyncState clears userId and pending and keeps the rest', () => {
        const { next } = applyPrefsPatch(syncedWithA(), { themeMode: 'light' });
        const toggled = toggleModeOverride(next, 'light');
        const s = resetSyncState(toggled);
        expect(s.sync).toEqual({
            userId: null,
            synced: toggled.sync.synced,
            pending: {},
        });
        expect(s.prefs).toBe(toggled.prefs);
        expect(s.modeOverride).toBe(toggled.modeOverride);
    });

    it('uploads only keys the account lacks after a signed-out edit', () => {
        const reset = resetSyncState(syncedWithA());
        const { next } = applyPrefsPatch(reset, {
            lightTheme: 'quizaroni-light',
            themeMode: 'light',
        });
        const s = mergeServerPrefs(next, { [ACCENT_KEY]: 'orange' }, 'A');
        expect(s.sync.pending).toEqual({ themeMode: 'light' });
    });

    it('does not leak one account into another', () => {
        const s = mergeServerPrefs(resetSyncState(syncedWithA()), {}, 'B');
        expect(s.sync.pending).toEqual({});
        expect(s.sync.synced).toEqual({
            themeMode: 'dark',
            [ACCENT_KEY]: 'orange',
        });

        const { next } = applyPrefsPatch(resetSyncState(syncedWithA()), {
            themeMode: 'light',
        });
        const t = mergeServerPrefs(next, {}, 'B');
        expect(t.sync.pending).toEqual({ themeMode: 'light' });
        expect(t.sync.synced).toEqual({ [ACCENT_KEY]: 'orange' });
    });

    it('does not leak after a second hop', () => {
        let s = mergeServerPrefs(resetSyncState(syncedWithA()), {}, 'B');
        s = mergeServerPrefs(resetSyncState(s), {}, 'B');
        expect(s.sync.pending).toEqual({});
        expect(s.prefs.themeMode).toBe('dark');
        s = mergeServerPrefs(resetSyncState(s), {}, 'C');
        expect(s.sync.pending).toEqual({});
    });

    it('lets the account override a carried baseline', () => {
        let s = mergeServerPrefs(resetSyncState(syncedWithA()), {}, 'B');
        s = mergeServerPrefs(s, { themeMode: 'light' }, 'B');
        expect(s.prefs.themeMode).toBe('light');
        expect(s.sync.synced.themeMode).toBe('light');
    });

    it('handles a different user with no sign-out between', () => {
        const s = mergeServerPrefs(
            syncedWithA(),
            { lightTheme: 'quizaroni-light' },
            'B'
        );
        expect(s.sync.pending).toEqual({});
        expect(s.sync.synced).toEqual({
            lightTheme: 'quizaroni-light',
            themeMode: 'dark',
            [ACCENT_KEY]: 'orange',
        });
    });

    it('does not upload the previous user unsent edit to a new user', () => {
        const { next } = applyPrefsPatch(syncedWithA(), { themeMode: 'light' });
        expect(next.sync.pending).toEqual({ themeMode: 'light' });
        const s = mergeServerPrefs(next, {}, 'B');
        expect(s.sync.pending).toEqual({});
    });
});

describe('save bookkeeping', () => {
    it('keeps a pending value that changed while the request was in flight', () => {
        const first = applyPrefsPatch(signedIn(), { themeMode: 'dark' }).next;
        const sent = { ...first.sync.pending };
        const second = applyPrefsPatch(first, { themeMode: 'light' }).next;
        const s = markSentSynced(second, sent);
        expect(s.sync.synced.themeMode).toBe('dark');
        expect(s.sync.pending).toEqual({ themeMode: 'light' });
    });

    it('reverts sent keys to synced, the default, or deletes an accent', () => {
        const start = signedIn('A', {
            sync: { userId: 'A', synced: { themeMode: 'dark' }, pending: {} },
        });
        const edited = applyPrefsPatch(start, {
            themeMode: 'light',
            lightTheme: 'quizaroni-light',
            themeAccents: { 'quizaroni-dark': 'orange' },
        }).next;
        const sent = { ...edited.sync.pending };
        const s = revertSent(edited, sent);
        expect(s.sync.pending).toEqual({});
        expect(s.prefs.themeMode).toBe('dark');
        expect(s.prefs.themeAccents).toEqual({});
    });
});

describe('flat prefs', () => {
    it('round-trips through flatten and unflatten', () => {
        const prefs: ThemePrefs = {
            ...DEFAULT_THEME_PREFS,
            themeMode: 'dark',
            themeAccents: { 'quizaroni-light': 'orange' },
        };
        expect({
            ...DEFAULT_THEME_PREFS,
            ...unflatten(flatten(prefs)),
        }).toEqual(prefs);
    });

    it('drops invalid entries', () => {
        expect(
            toFlatPrefs({
                themeMode: 'sepia',
                lightTheme: 'quizaroni-light',
                darkTheme: 42,
                themeAccents: {
                    'quizaroni-light': '',
                    'quizaroni-dark': 'x'.repeat(65),
                    nope: 'orange',
                },
            })
        ).toEqual({ lightTheme: 'quizaroni-light' });
    });
});
