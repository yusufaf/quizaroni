import { describe, it, expect } from 'vitest';
import { isTypingTarget, hasModifier } from './guards';

const ev = (target: Partial<HTMLElement>, mods: Partial<KeyboardEvent> = {}) =>
    ({ target, ...mods }) as unknown as KeyboardEvent;

describe('isTypingTarget', () => {
    it('true for INPUT, TEXTAREA, SELECT', () => {
        expect(isTypingTarget(ev({ tagName: 'INPUT' }))).toBe(true);
        expect(isTypingTarget(ev({ tagName: 'TEXTAREA' }))).toBe(true);
        expect(isTypingTarget(ev({ tagName: 'SELECT' }))).toBe(true);
    });
    it('true for contenteditable', () => {
        expect(
            isTypingTarget(ev({ tagName: 'DIV', isContentEditable: true }))
        ).toBe(true);
    });
    it('false for a plain div', () => {
        expect(
            isTypingTarget(ev({ tagName: 'DIV', isContentEditable: false }))
        ).toBe(false);
    });
    it('false when no target', () => {
        expect(isTypingTarget(ev(null as unknown as HTMLElement))).toBe(false);
    });
});

describe('hasModifier', () => {
    it('true for ctrl/meta/alt, false for shift/none', () => {
        expect(hasModifier(ev({ tagName: 'DIV' }, { ctrlKey: true }))).toBe(
            true
        );
        expect(hasModifier(ev({ tagName: 'DIV' }, { metaKey: true }))).toBe(
            true
        );
        expect(hasModifier(ev({ tagName: 'DIV' }, { altKey: true }))).toBe(
            true
        );
        expect(hasModifier(ev({ tagName: 'DIV' }, { shiftKey: true }))).toBe(
            false
        );
        expect(hasModifier(ev({ tagName: 'DIV' }))).toBe(false);
    });
});
