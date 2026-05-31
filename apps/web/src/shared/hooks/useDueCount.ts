import { useState, useEffect } from 'react';
import { cardProgressRepository } from 'state/local/repositories';

// Returns the number of cards currently due for review in a studyset.
export function useDueCount(studysetUUID: string): {
    count: number;
    isLoading: boolean;
} {
    const [count, setCount] = useState(0);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        setIsLoading(true);
        void (async () => {
            const due = await cardProgressRepository.getDueCount(studysetUUID);
            if (!cancelled) {
                setCount(due);
                setIsLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [studysetUUID]);

    return { count, isLoading };
}
