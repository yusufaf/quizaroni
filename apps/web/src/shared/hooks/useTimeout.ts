import { useCallback, useEffect, useRef } from 'react';

// One pending timeout per caller, cancelled on unmount. Study views use it so
// an auto-advance scheduled for one session can't fire after the view is gone
// and act on whichever session is stored by then.
export default function useTimeout() {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const clear = useCallback(() => {
        if (timerRef.current !== null) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const schedule = useCallback(
        (callback: () => void, delay: number) => {
            clear();
            timerRef.current = setTimeout(() => {
                timerRef.current = null;
                callback();
            }, delay);
        },
        [clear]
    );

    useEffect(() => clear, [clear]);

    return { schedule, clear };
}
