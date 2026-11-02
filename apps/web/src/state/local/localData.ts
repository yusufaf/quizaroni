import {
    settleGamificationSync,
    useGamificationStore,
} from 'state/stores/gamification';
import { useStudySessionStore } from 'state/stores/studySession';
import { getDatabase, hasPendingSync } from './db';
import {
    handleOwnerStorageEvent,
    markStoredOwnerSignedOut,
    setClaimedOwner,
    storedOwnerId,
    writeStoredOwner,
} from './owner';

/**
 * Removes every account-specific piece of local data: all Dexie tables plus the
 * persisted gamification and study-session stores. Tables are cleared rather
 * than the database deleted, because repositories cache their Dexie instance
 * and Dexie 4 `delete()` closes it for good.
 */
export async function clearLocalData(): Promise<void> {
    setClaimedOwner(null);
    markStoredOwnerSignedOut();

    const db = getDatabase();
    await db.transaction('rw', db.tables, () =>
        Promise.all(db.tables.map((table) => table.clear()))
    );

    useGamificationStore.setState(useGamificationStore.getInitialState(), true);
    useStudySessionStore.setState(useStudySessionStore.getInitialState(), true);
}

/**
 * Drops only the local gamification copy, which the server holds too. Used on
 * devices from before ownership tracking, where we can't tell whose data it is.
 */
export async function resetLocalGamification(): Promise<void> {
    const db = getDatabase();
    await db.transaction('rw', [db.gamification, db.customAchievements], () =>
        Promise.all([db.gamification.clear(), db.customAchievements.clear()])
    );

    useGamificationStore.setState(useGamificationStore.getInitialState(), true);
}

let storageListenerInstalled = false;

/**
 * Makes the device's local data belong to `userUUID` for this page load,
 * wiping it first if it belonged to another account. Pushes to the server stay
 * blocked until this resolves.
 */
export async function claimLocalData(userUUID: string): Promise<void> {
    const owner = storedOwnerId();
    if (owner === null) {
        await resetLocalGamification();
    } else if (owner !== userUUID) {
        await clearLocalData();
    }

    writeStoredOwner(userUUID);
    setClaimedOwner(userUUID);

    if (!storageListenerInstalled) {
        storageListenerInstalled = true;
        window.addEventListener('storage', (event) =>
            handleOwnerStorageEvent(event)
        );
    }
}

/**
 * Whether signing out now would lose progress meant for the server. Waits for
 * pushes already in flight and retries a pending one, but gives up after
 * `timeoutMs` and reports `true`, so a bad network can't stall sign-out.
 */
export async function hasUnsyncedLocalChanges({
    timeoutMs = 3000,
}: { timeoutMs?: number } = {}): Promise<boolean> {
    const flush = (async () => {
        await settleGamificationSync();
        await useGamificationStore.getState().retryPendingSync();
    })();

    let timer: ReturnType<typeof setTimeout> | undefined;
    const settled = await Promise.race([
        flush.then(
            () => true,
            () => true
        ),
        new Promise<boolean>((resolve) => {
            timer = setTimeout(() => resolve(false), timeoutMs);
        }),
    ]);
    clearTimeout(timer);

    if (!settled) return true;

    return (
        useGamificationStore.getState().syncPending || (await hasPendingSync())
    );
}
