import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from 'react';
import { GlobalStyles } from '@mui/material';
import { ThemeProvider } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { ThemeContext, type ThemeContextType } from './ThemeContext';
import { createAppTheme } from './createAppTheme';
import {
    applyPrefsPatch,
    clearRedundantOverride,
    effectiveMode,
    markSentSynced,
    mergeServerPrefs,
    readStoredTheme,
    resetSyncState,
    resolveAccent,
    resolveThemeId,
    revertSent as revertSentPrefs,
    THEME_STORAGE_KEY,
    toggleModeOverride,
    writeStoredTheme,
    type FlatPrefs,
    type StoredTheme,
    type ThemePrefsPatch,
} from './prefs';
import { getThemeDefinition } from './registry';
import type { ThemeMode } from './tokens';

type Props = {
    children: ReactNode;
};

const paintDocument = (bg: string, bar: string, mode: ThemeMode) => {
    const html = document.documentElement;
    html.style.backgroundColor = bg;
    html.style.colorScheme = mode;
    let meta = document.querySelector<HTMLMetaElement>(
        'meta[name="theme-color"]'
    );
    if (!meta) {
        meta = document.createElement('meta');
        meta.name = 'theme-color';
        document.head.appendChild(meta);
    }
    meta.content = bar;
};

export const CustomThemeProvider = ({ children }: Props) => {
    const initialFontScale = Number(
        localStorage.getItem('fontSizeScale') ?? '1'
    );
    const [fontSizeScale, setFontSizeScaleState] =
        useState<number>(initialFontScale);

    const osMode: ThemeMode = useMediaQuery('(prefers-color-scheme: dark)', {
        noSsr: true,
    })
        ? 'dark'
        : 'light';
    const osRef = useRef<ThemeMode>(osMode);
    osRef.current = osMode;

    const [stored, setStored] = useState<StoredTheme>(() => readStoredTheme());
    const storedRef = useRef(stored);
    const [editSeq, setEditSeq] = useState(0);

    // Every change reads the latest stored blob, writes it back and updates
    // React, so tabs sharing localStorage never act on a stale copy.
    const commit = useCallback((op: (s: StoredTheme) => StoredTheme) => {
        const next = clearRedundantOverride(
            op(readStoredTheme(storedRef.current)),
            osRef.current
        );
        writeStoredTheme(next);
        storedRef.current = next;
        setStored(next);
    }, []);

    const getStored = useCallback(() => readStoredTheme(storedRef.current), []);

    const setThemePrefs = useCallback(
        (patch: ThemePrefsPatch) => {
            let pendingChanged = false;
            commit((s) => {
                const result = applyPrefsPatch(s, patch);
                pendingChanged = result.pendingChanged;
                return result.next;
            });
            if (pendingChanged) setEditSeq((n) => n + 1);
        },
        [commit]
    );

    const toggleDarkMode = useCallback(
        () => commit((s) => toggleModeOverride(s, osRef.current)),
        [commit]
    );

    const applyServerPrefs = useCallback(
        (server: FlatPrefs, userId: string) =>
            commit((s) => mergeServerPrefs(s, server, userId)),
        [commit]
    );

    const markSynced = useCallback(
        (sent: FlatPrefs) => commit((s) => markSentSynced(s, sent)),
        [commit]
    );

    const revertSent = useCallback(
        (sent: FlatPrefs) => commit((s) => revertSentPrefs(s, sent)),
        [commit]
    );

    const resetSync = useCallback(() => commit(resetSyncState), [commit]);

    // Also runs on mount, which writes the blob: the legacy key is dropped
    // and the paint colours are cached for the first-paint script.
    useEffect(() => {
        commit((s) => clearRedundantOverride(s, osMode));
    }, [osMode, commit]);

    useEffect(() => {
        const onStorage = (e: StorageEvent) => {
            if (e.key !== THEME_STORAGE_KEY && e.key !== null) return;
            const s = readStoredTheme(storedRef.current);
            storedRef.current = s;
            setStored(s);
        };
        window.addEventListener('storage', onStorage);
        return () => window.removeEventListener('storage', onStorage);
    }, []);

    const mode = effectiveMode(stored, osMode);
    const activeThemeId = resolveThemeId(stored.prefs, mode);
    const accentId = resolveAccent(stored.prefs, activeThemeId);

    const muiTheme = useMemo(
        () =>
            createAppTheme(
                getThemeDefinition(activeThemeId),
                accentId,
                fontSizeScale
            ),
        [activeThemeId, accentId, fontSizeScale]
    );

    useEffect(() => {
        const { palette } = muiTheme;
        paintDocument(
            palette.background.default,
            palette.background.paper,
            palette.mode
        );
    }, [muiTheme]);

    const setFontSizeScale = useCallback((scale: number) => {
        localStorage.setItem('fontSizeScale', String(scale));
        setFontSizeScaleState(scale);
    }, []);

    const contextValue = useMemo<ThemeContextType>(
        () => ({
            theme: mode,
            isDarkMode: mode === 'dark',
            muiTheme,
            fontSizeScale,
            setFontSizeScale,
            toggleDarkMode,
            prefs: stored.prefs,
            modeOverride: stored.modeOverride,
            activeThemeId,
            setThemePrefs,
            editSeq,
            getStored,
            applyServerPrefs,
            markSynced,
            revertSent,
            resetSync,
        }),
        [
            mode,
            muiTheme,
            fontSizeScale,
            setFontSizeScale,
            toggleDarkMode,
            stored.prefs,
            stored.modeOverride,
            activeThemeId,
            setThemePrefs,
            editSeq,
            getStored,
            applyServerPrefs,
            markSynced,
            revertSent,
            resetSync,
        ]
    );

    return (
        <ThemeContext.Provider value={contextValue}>
            <ThemeProvider theme={muiTheme}>
                <GlobalStyles
                    styles={(t) => ({
                        body: {
                            '--toastify-color-light':
                                t.palette.background.paper,
                            '--toastify-color-dark': t.palette.background.paper,
                            '--toastify-text-color-light':
                                t.palette.text.primary,
                            '--toastify-text-color-dark':
                                t.palette.text.primary,
                        },
                    })}
                />
                {children}
            </ThemeProvider>
        </ThemeContext.Provider>
    );
};
