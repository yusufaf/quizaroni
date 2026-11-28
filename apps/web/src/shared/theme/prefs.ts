import { THEMES } from './registry';
import {
    DARK_THEME_IDS,
    isThemeId,
    LIGHT_THEME_IDS,
    THEME_MODE_PREFS,
    type DarkThemeId,
    type LightThemeId,
    type ThemeId,
    type ThemeModePref,
} from './themeIds';
import type { ThemeMode } from './tokens';

export const THEME_STORAGE_KEY = 'quizaroni.theme';
export const LEGACY_THEME_STORAGE_KEY = 'appTheme';
export type { ThemeModePref } from './themeIds';

export interface ThemePrefs {
    themeMode: ThemeModePref;
    lightTheme: LightThemeId;
    darkTheme: DarkThemeId;
    themeAccents: Partial<Record<ThemeId, string>>;
}
export type ThemePrefsPatch = Partial<Omit<ThemePrefs, 'themeAccents'>> & {
    themeAccents?: Partial<Record<ThemeId, string>>;
};
export type SyncKey =
    | 'themeMode'
    | 'lightTheme'
    | 'darkTheme'
    | `themeAccents.${ThemeId}`;
export type FlatPrefs = Partial<Record<SyncKey, string>>;
export interface ThemeSyncState {
    userId: string | null;
    synced: FlatPrefs;
    pending: FlatPrefs;
}
export interface PaintEntry {
    bg: string;
    bar: string;
}
export interface StoredTheme {
    v: 1;
    prefs: ThemePrefs;
    modeOverride: ThemeMode | null;
    sync: ThemeSyncState;
    paint: Record<ThemeMode, PaintEntry>;
}

export const DEFAULT_THEME_PREFS: ThemePrefs = {
    themeMode: 'system',
    lightTheme: 'quizaroni-light',
    darkTheme: 'quizaroni-dark',
    themeAccents: {},
};

const ACCENT_PREFIX = 'themeAccents.';

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const isAccentValue = (value: unknown): value is string =>
    typeof value === 'string' && value.length >= 1 && value.length <= 64;

const includes = (list: readonly string[], value: unknown): value is string =>
    typeof value === 'string' && list.includes(value);

const validFlatEntry = (key: string, value: unknown): boolean => {
    if (key === 'themeMode') return includes(THEME_MODE_PREFS, value);
    if (key === 'lightTheme') return includes(LIGHT_THEME_IDS, value);
    if (key === 'darkTheme') return includes(DARK_THEME_IDS, value);
    if (key.startsWith(ACCENT_PREFIX)) {
        return (
            isThemeId(key.slice(ACCENT_PREFIX.length)) && isAccentValue(value)
        );
    }
    return false;
};

const sanitizeFlat = (value: unknown): FlatPrefs => {
    if (!isRecord(value)) return {};
    const flat: FlatPrefs = {};
    for (const [key, entry] of Object.entries(value)) {
        if (validFlatEntry(key, entry)) flat[key as SyncKey] = entry as string;
    }
    return flat;
};

export const flatten = (prefs: ThemePrefs): FlatPrefs => {
    const flat: FlatPrefs = {
        themeMode: prefs.themeMode,
        lightTheme: prefs.lightTheme,
        darkTheme: prefs.darkTheme,
    };
    for (const [id, accent] of Object.entries(prefs.themeAccents)) {
        if (accent !== undefined)
            flat[`${ACCENT_PREFIX}${id}` as SyncKey] = accent;
    }
    return flat;
};

// Only the keys present; accent keys are regrouped under themeAccents. This is
// the shape sent to update-metadata.
export const unflatten = (flat: FlatPrefs): ThemePrefsPatch => {
    const patch: ThemePrefsPatch = {};
    const accents: Partial<Record<ThemeId, string>> = {};
    for (const [key, value] of Object.entries(flat)) {
        if (value === undefined) continue;
        if (key.startsWith(ACCENT_PREFIX)) {
            accents[key.slice(ACCENT_PREFIX.length) as ThemeId] = value;
        } else if (key === 'themeMode') {
            patch.themeMode = value as ThemeModePref;
        } else if (key === 'lightTheme') {
            patch.lightTheme = value as LightThemeId;
        } else if (key === 'darkTheme') {
            patch.darkTheme = value as DarkThemeId;
        }
    }
    if (Object.keys(accents).length > 0) patch.themeAccents = accents;
    return patch;
};

// Takes the prefs shape or user metadata and keeps only valid entries.
export const toFlatPrefs = (value: unknown): FlatPrefs => {
    if (!isRecord(value)) return {};
    const flat: FlatPrefs = {};
    for (const key of ['themeMode', 'lightTheme', 'darkTheme'] as const) {
        if (validFlatEntry(key, value[key])) flat[key] = value[key] as string;
    }
    if (isRecord(value.themeAccents)) {
        for (const [id, accent] of Object.entries(value.themeAccents)) {
            const key = `${ACCENT_PREFIX}${id}`;
            if (validFlatEntry(key, accent)) {
                flat[key as SyncKey] = accent as string;
            }
        }
    }
    return flat;
};

export const prefsFromFlat = (flat: FlatPrefs): ThemePrefs => ({
    ...DEFAULT_THEME_PREFS,
    ...unflatten(flat),
    themeAccents: unflatten(flat).themeAccents ?? {},
});

const DEFAULTS_FLAT = flatten(DEFAULT_THEME_PREFS);

export const resolveMode = (pref: ThemeModePref, os: ThemeMode): ThemeMode =>
    pref === 'system' ? os : pref;

export const effectiveMode = (
    s: Pick<StoredTheme, 'prefs' | 'modeOverride'>,
    os: ThemeMode
): ThemeMode => s.modeOverride ?? resolveMode(s.prefs.themeMode, os);

export const resolveThemeId = (prefs: ThemePrefs, mode: ThemeMode): ThemeId => {
    if (mode === 'light') {
        return includes(LIGHT_THEME_IDS, prefs.lightTheme)
            ? prefs.lightTheme
            : DEFAULT_THEME_PREFS.lightTheme;
    }
    return includes(DARK_THEME_IDS, prefs.darkTheme)
        ? prefs.darkTheme
        : DEFAULT_THEME_PREFS.darkTheme;
};

export const resolveAccent = (prefs: ThemePrefs, themeId: ThemeId): string => {
    const def = THEMES[themeId];
    const chosen = prefs.themeAccents[themeId];
    return chosen && def.accents.some((a) => a.id === chosen)
        ? chosen
        : def.defaultAccent;
};

export const paintFor = (prefs: ThemePrefs): Record<ThemeMode, PaintEntry> => {
    const entry = (mode: ThemeMode): PaintEntry => {
        const { tokens } = THEMES[resolveThemeId(prefs, mode)];
        return { bg: tokens.bg, bar: tokens.paper };
    };
    return { light: entry('light'), dark: entry('dark') };
};

export const defaultStoredTheme = (): StoredTheme => ({
    v: 1,
    prefs: { ...DEFAULT_THEME_PREFS, themeAccents: {} },
    modeOverride: null,
    sync: { userId: null, synced: {}, pending: {} },
    paint: paintFor(DEFAULT_THEME_PREFS),
});

export const parseStoredTheme = (raw: string | null): StoredTheme => {
    if (raw === null) return defaultStoredTheme();
    let data: unknown;
    try {
        data = JSON.parse(raw);
    } catch {
        return defaultStoredTheme();
    }
    if (!isRecord(data) || data.v !== 1) return defaultStoredTheme();
    const prefs = prefsFromFlat(toFlatPrefs(data.prefs));
    const sync = isRecord(data.sync) ? data.sync : {};
    return {
        v: 1,
        prefs,
        modeOverride:
            data.modeOverride === 'light' || data.modeOverride === 'dark'
                ? data.modeOverride
                : null,
        sync: {
            userId: typeof sync.userId === 'string' ? sync.userId : null,
            synced: sanitizeFlat(sync.synced),
            pending: sanitizeFlat(sync.pending),
        },
        paint: paintFor(prefs),
    };
};

export const readStoredTheme = (fallback?: StoredTheme): StoredTheme => {
    try {
        return parseStoredTheme(localStorage.getItem(THEME_STORAGE_KEY));
    } catch {
        return fallback ?? defaultStoredTheme();
    }
};

export const writeStoredTheme = (s: StoredTheme): void => {
    try {
        localStorage.setItem(
            THEME_STORAGE_KEY,
            JSON.stringify({ ...s, paint: paintFor(s.prefs) })
        );
        localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
    } catch {
        // Storage can be full or blocked; the in-memory state still applies.
    }
};

export const applyPrefsPatch = (
    s: StoredTheme,
    patch: ThemePrefsPatch
): { next: StoredTheme; pendingChanged: boolean } => {
    const merged = {
        ...s.prefs,
        ...patch,
        themeAccents: { ...s.prefs.themeAccents, ...patch.themeAccents },
    };
    const prefs = prefsFromFlat(toFlatPrefs(merged));
    const before = flatten(s.prefs);
    const after = flatten(prefs);
    const changed = (Object.keys(after) as SyncKey[]).filter(
        (k) => after[k] !== undefined && after[k] !== before[k]
    );
    const modeOverride = patch.themeMode !== undefined ? null : s.modeOverride;

    if (s.sync.userId === null) {
        return {
            next: { ...s, prefs, modeOverride, paint: paintFor(prefs) },
            pendingChanged: false,
        };
    }
    const pending = { ...s.sync.pending };
    for (const k of changed) pending[k] = after[k];
    return {
        next: {
            ...s,
            prefs,
            modeOverride,
            sync: { ...s.sync, pending },
            paint: paintFor(prefs),
        },
        pendingChanged: changed.length > 0,
    };
};

export const toggleModeOverride = (
    s: StoredTheme,
    os: ThemeMode
): StoredTheme => {
    const target = effectiveMode(s, os) === 'dark' ? 'light' : 'dark';
    return {
        ...s,
        modeOverride:
            target === resolveMode(s.prefs.themeMode, os) ? null : target,
    };
};

export const clearRedundantOverride = (
    s: StoredTheme,
    os: ThemeMode
): StoredTheme =>
    s.modeOverride !== null &&
    s.modeOverride === resolveMode(s.prefs.themeMode, os)
        ? { ...s, modeOverride: null }
        : s;

const withLocal = (s: StoredTheme, local: FlatPrefs, sync: ThemeSyncState) => {
    const prefs = prefsFromFlat(local);
    return { ...s, prefs, sync, paint: paintFor(prefs) };
};

// The account wins for keys it has. A device pick the account lacks is
// uploaded only if it changed since the device left its previous account (or
// from the defaults on a fresh device), so one account's settings never leak
// into another.
export const reconcileFirstSignIn = (
    s: StoredTheme,
    server: FlatPrefs,
    userId: string
): StoredTheme => {
    const switchedUser = s.sync.userId !== null;
    const baseline: FlatPrefs = switchedUser
        ? { ...s.sync.synced, ...s.sync.pending }
        : s.sync.synced;
    const pending: FlatPrefs = switchedUser ? {} : { ...s.sync.pending };
    const synced: FlatPrefs = {};
    const local = flatten(s.prefs);

    for (const [k, v] of Object.entries(server) as [SyncKey, string][]) {
        if (pending[k] !== undefined) continue;
        local[k] = v;
        synced[k] = v;
    }
    for (const [k, v] of Object.entries(local) as [SyncKey, string][]) {
        if (server[k] !== undefined) continue;
        const ref = baseline[k] ?? DEFAULTS_FLAT[k];
        if (v !== ref) {
            pending[k] = v;
        } else if (baseline[k] !== undefined) {
            // Carried forward so it is still the baseline after this
            // account's own sign-out.
            synced[k] = baseline[k];
        }
    }
    return withLocal(s, local, { userId, synced, pending });
};

export const reconcileServerPrefs = (
    s: StoredTheme,
    server: FlatPrefs
): StoredTheme => {
    const local = flatten(s.prefs);
    const synced = { ...s.sync.synced };
    const pending = { ...s.sync.pending };
    for (const [k, v] of Object.entries(server) as [SyncKey, string][]) {
        if (pending[k] !== undefined) {
            if (pending[k] === v) {
                synced[k] = v;
                delete pending[k];
            }
            continue;
        }
        if (v !== synced[k]) {
            local[k] = v;
            synced[k] = v;
        }
    }
    return withLocal(s, local, { ...s.sync, synced, pending });
};

export const mergeServerPrefs = (
    s: StoredTheme,
    server: FlatPrefs,
    userId: string
): StoredTheme =>
    s.sync.userId !== userId
        ? reconcileFirstSignIn(s, server, userId)
        : reconcileServerPrefs(s, server);

export const markSentSynced = (
    s: StoredTheme,
    sent: FlatPrefs
): StoredTheme => {
    const synced = { ...s.sync.synced };
    const pending = { ...s.sync.pending };
    for (const [k, v] of Object.entries(sent) as [SyncKey, string][]) {
        synced[k] = v;
        if (pending[k] === v) delete pending[k];
    }
    return { ...s, sync: { ...s.sync, synced, pending } };
};

export const revertSent = (s: StoredTheme, sent: FlatPrefs): StoredTheme => {
    const local = flatten(s.prefs);
    const pending = { ...s.sync.pending };
    for (const [k, v] of Object.entries(sent) as [SyncKey, string][]) {
        if (pending[k] !== v) continue;
        delete pending[k];
        const fallback = s.sync.synced[k] ?? DEFAULTS_FLAT[k];
        if (fallback === undefined) delete local[k];
        else local[k] = fallback;
    }
    return withLocal(s, local, { ...s.sync, pending });
};

// synced is kept as the first-sign-in baseline; nothing else reads it while
// userId is null.
export const resetSyncState = (s: StoredTheme): StoredTheme => ({
    ...s,
    sync: { userId: null, synced: s.sync.synced, pending: {} },
});
