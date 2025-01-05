import { useEffect, useLayoutEffect, useRef } from "react";

export function useClickAway(callback, additionalRefs: any[] = []) {
    const ref = useRef(null);
    const callbackRef = useRef(callback);

    useLayoutEffect(() => {
        callbackRef.current = callback;
    });

    useEffect(() => {
        const handler = (e) => {
            const element = ref.current;
            const isInRefs = additionalRefs.some((ref) =>
                ref.current.contains(e.target)
            );

            if (element && !element.contains(e.target) && !isInRefs) {
                callbackRef.current(e);
            }
        };

        document.addEventListener("mousedown", handler);
        document.addEventListener("touchstart", handler);

        return () => {
            document.removeEventListener("mousedown", handler);
            document.removeEventListener("touchstart", handler);
        };
    }, []);

    return ref;
}
