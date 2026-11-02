// Tracks which account the device's local data belongs to. Deliberately has no
// imports: the gamification push path depends on it, and localData.ts depends
// on that path.

export const LOCAL_DATA_OWNER_KEY = 'quizaroni-local-data-owner';

// Appended when the owner signs out. The marker still names whose data is on
// the device, but its raw value changes so every other tab's claim goes stale.
const SIGNED_OUT_SUFFIX = ':signed-out';

let claimedOwner: string | null = null;

export const getClaimedOwner = (): string | null => claimedOwner;

export const setClaimedOwner = (userUUID: string | null): void => {
    claimedOwner = userUUID;
};

export const readStoredOwner = (): string | null => {
    try {
        return localStorage.getItem(LOCAL_DATA_OWNER_KEY);
    } catch {
        return null;
    }
};

export const writeStoredOwner = (value: string): void => {
    try {
        localStorage.setItem(LOCAL_DATA_OWNER_KEY, value);
    } catch {
        // Storage unavailable: isClaimCurrent() stays false, so nothing pushes.
    }
};

const ownerIdOf = (value: string | null): string | null =>
    value?.endsWith(SIGNED_OUT_SUFFIX)
        ? value.slice(0, -SIGNED_OUT_SUFFIX.length)
        : value;

export const storedOwnerId = (): string | null => ownerIdOf(readStoredOwner());

export const markStoredOwnerSignedOut = (): void => {
    const stored = readStoredOwner();
    if (stored !== null && !stored.endsWith(SIGNED_OUT_SUFFIX)) {
        writeStoredOwner(stored + SIGNED_OUT_SUFFIX);
    }
};

// The push gate. False until this page load claims the data, in a tab whose
// claim was superseded by another account, and in a tab whose account signed
// out elsewhere — auth tokens live in shared localStorage, so a stale tab would
// otherwise push its in-memory data with whichever account's token is there.
export const isClaimCurrent = (): boolean =>
    claimedOwner !== null && claimedOwner === readStoredOwner();

// Reloads a tab once another tab claims the data for a different account, so it
// stops showing or writing back the previous account's in-memory state. A
// same-account sign-out doesn't reload: that could race the signing-out tab and
// re-claim the account, and the push gate already blocks this tab.
export function handleOwnerStorageEvent(
    event: StorageEvent,
    reload: () => void = () => window.location.reload()
): void {
    if (
        event.key === LOCAL_DATA_OWNER_KEY &&
        claimedOwner !== null &&
        ownerIdOf(event.newValue) !== claimedOwner
    ) {
        reload();
    }
}
