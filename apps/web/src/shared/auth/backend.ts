// A function rather than a constant so tests can flip it with vi.stubEnv.
export const isSelfHost = (): boolean =>
    import.meta.env.VITE_BACKEND === 'selfhost';
