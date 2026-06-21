import { useEffect, useRef } from 'react';
import { useShortcutRegistry } from './ShortcutRegistry';
import { isTypingTarget, hasModifier } from './guards';

const SEQUENCE_TIMEOUT_MS = 800;

export function useGlobalKeyListener(): void {
    const reg = useShortcutRegistry();
    const pendingRef = useRef<string | null>(null);
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const clearPending = () => {
            pendingRef.current = null;
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };

        const onKey = (e: KeyboardEvent) => {
            if (hasModifier(e)) return;
            const typing = isTypingTarget(e);
            const active = reg.getActive();

            // Resolve combo, consuming any pending prefix.
            let combo = e.key;
            if (pendingRef.current) {
                combo = `${pendingRef.current} ${e.key}`;
                clearPending();
            }

            const match = active.find(
                (s) =>
                    s.keys.includes(combo) &&
                    (!typing || combo === 'Escape') &&
                    (s.when ? s.when() : true)
            );

            if (match) {
                e.preventDefault();
                match.handler(e);
                return;
            }

            // Start a new two-key sequence if some active binding expects it.
            if (
                !typing &&
                active.some((s) =>
                    s.keys.some((k) => k.startsWith(`${e.key} `))
                )
            ) {
                pendingRef.current = e.key;
                timerRef.current = setTimeout(
                    clearPending,
                    SEQUENCE_TIMEOUT_MS
                );
            }
        };

        window.addEventListener('keydown', onKey);
        return () => {
            window.removeEventListener('keydown', onKey);
            clearPending();
        };
    }, [reg]);
}
