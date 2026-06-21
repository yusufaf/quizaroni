import {
    createContext,
    useContext,
    useRef,
    useState,
    useCallback,
    ReactNode,
} from 'react';
import type { Shortcut } from './shortcutTypes';

interface RegistryApi {
    register: (s: Shortcut) => void;
    unregister: (id: string) => void;
    getActive: () => Shortcut[];
    /** Bumped on every change so consumers (help modal) re-render. */
    version: number;
}

const ShortcutContext = createContext<RegistryApi | null>(null);

export function ShortcutProvider({ children }: { children: ReactNode }) {
    const mapRef = useRef<Map<string, Shortcut>>(new Map());
    const [version, setVersion] = useState(0);

    const register = useCallback((s: Shortcut) => {
        mapRef.current.set(s.id, s);
        setVersion((v) => v + 1);
    }, []);

    const unregister = useCallback((id: string) => {
        mapRef.current.delete(id);
        setVersion((v) => v + 1);
    }, []);

    const getActive = useCallback(
        () => Array.from(mapRef.current.values()),
        []
    );

    return (
        <ShortcutContext.Provider
            value={{ register, unregister, getActive, version }}
        >
            {children}
        </ShortcutContext.Provider>
    );
}

export function useShortcutRegistry(): RegistryApi {
    const ctx = useContext(ShortcutContext);
    if (!ctx) {
        throw new Error(
            'useShortcutRegistry must be used within ShortcutProvider'
        );
    }
    return ctx;
}
