import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-toastify';
import { useAuth } from 'shared/auth/useAuth';
import { isRetryableSyncError } from 'state/api/apiClient';
import { useGetUser, useUpdateUserMetadata } from 'state/api/usersAPI';
import { toFlatPrefs, unflatten, type FlatPrefs } from './prefs';
import { useTheme } from './useTheme';

export const THEME_SYNC_DEBOUNCE_MS = 400;

const omitKeys = (flat: FlatPrefs, keys: string[]): FlatPrefs =>
    Object.fromEntries(
        Object.entries(flat).filter(([k]) => !keys.includes(k))
    ) as FlatPrefs;

// Pushes theme edits to the account and merges the account's values in. It
// lives at app level so a save survives leaving the Settings tab.
export function ThemeSync(): null {
    const { t } = useTranslation();
    const { isAuthenticated } = useAuth();
    const { data, dataUpdatedAt, refetch } = useGetUser({
        enabled: isAuthenticated,
    });
    const { mutateAsync } = useUpdateUserMetadata();
    const theme = useTheme();
    const userUUID = isAuthenticated ? data?.user.userUUID : undefined;

    const latest = useRef({
        t,
        theme,
        mutateAsync,
        refetch,
        isAuthenticated,
        userUUID,
    });
    latest.current = {
        t,
        theme,
        mutateAsync,
        refetch,
        isAuthenticated,
        userUUID,
    };

    const inFlight = useRef(false);
    const queued = useRef<{ server: FlatPrefs; userId: string } | null>(null);
    const toastArmed = useRef(false);
    const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

    const engine = useRef({
        async flush(): Promise<void> {
            if (inFlight.current || !navigator.onLine) return;
            const { userUUID: user } = latest.current;
            const s = latest.current.theme.getStored();
            if (
                !user ||
                s.sync.userId !== user ||
                Object.keys(s.sync.pending).length === 0
            ) {
                return;
            }
            const sent = { ...s.sync.pending };
            inFlight.current = true;
            let ok = false;
            try {
                await latest.current.mutateAsync({ updates: unflatten(sent) });
                ok = true;
                toastArmed.current = false;
                latest.current.theme.markSynced(sent);
            } catch (error) {
                const fail = () =>
                    toast.error(latest.current.t('errors.saveFailed'));
                if (isRetryableSyncError(error)) {
                    if (toastArmed.current) {
                        toastArmed.current = false;
                        fail();
                    }
                } else {
                    latest.current.theme.revertSent(sent);
                    fail();
                }
            } finally {
                inFlight.current = false;
            }
            const q = queued.current;
            queued.current = null;
            if (q) {
                // A GET that started before the save could still hold the
                // old values of the keys just sent.
                engine.current.apply(
                    ok ? omitKeys(q.server, Object.keys(sent)) : q.server,
                    q.userId
                );
            } else if (ok) {
                void engine.current.flush();
            }
        },
        apply(server: FlatPrefs, userId: string): void {
            if (inFlight.current) {
                queued.current = { server, userId };
                return;
            }
            latest.current.theme.applyServerPrefs(server, userId);
            void engine.current.flush();
        },
    });

    useEffect(() => {
        if (!isAuthenticated) latest.current.theme.resetSync();
    }, [isAuthenticated]);

    useEffect(() => {
        if (!userUUID || !data) return;
        engine.current.apply(toFlatPrefs(data.user.metadata), userUUID);
        // Keyed on dataUpdatedAt so a refetch with equal data still merges.
    }, [dataUpdatedAt, userUUID]);

    useEffect(() => {
        if (theme.editSeq === 0) return;
        toastArmed.current = true;
        clearTimeout(timer.current);
        timer.current = setTimeout(
            () => void engine.current.flush(),
            THEME_SYNC_DEBOUNCE_MS
        );
    }, [theme.editSeq]);

    useEffect(() => {
        const onPageHide = () => {
            clearTimeout(timer.current);
            void engine.current.flush();
        };
        const onOnline = () => {
            clearTimeout(timer.current);
            // Opened offline: react-query never notices the reconnect, so
            // load the user; the merge then flushes.
            if (latest.current.isAuthenticated && !latest.current.userUUID) {
                void latest.current.refetch();
            } else {
                void engine.current.flush();
            }
        };
        window.addEventListener('pagehide', onPageHide);
        window.addEventListener('online', onOnline);
        return () => {
            window.removeEventListener('pagehide', onPageHide);
            window.removeEventListener('online', onOnline);
            clearTimeout(timer.current);
        };
    }, []);

    return null;
}
