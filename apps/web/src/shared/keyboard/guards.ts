export function isTypingTarget(e: KeyboardEvent): boolean {
    const t = e.target as HTMLElement | null;
    if (!t) return false;
    const tag = t.tagName;
    return (
        tag === 'INPUT' ||
        tag === 'TEXTAREA' ||
        tag === 'SELECT' ||
        t.isContentEditable === true
    );
}

/** Shift is intentionally NOT a modifier here (needed for '?'). */
export function hasModifier(e: KeyboardEvent): boolean {
    return Boolean(e.ctrlKey || e.metaKey || e.altKey);
}
