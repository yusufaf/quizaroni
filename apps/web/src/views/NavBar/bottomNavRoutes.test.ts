import { describe, it, expect } from 'vitest';
import { BOTTOM_NAV_VALUES, getBottomNavValue } from './bottomNavRoutes';
import { isStudyRoute } from 'shared/utilities/routes';

describe('getBottomNavValue', () => {
    it('maps home', () => {
        expect(getBottomNavValue('/')).toBe(BOTTOM_NAV_VALUES.HOME);
    });

    it('maps explore', () => {
        expect(getBottomNavValue('/explore')).toBe(BOTTOM_NAV_VALUES.EXPLORE);
    });

    it('rolls nested create routes up to create', () => {
        expect(getBottomNavValue('/create')).toBe(BOTTOM_NAV_VALUES.CREATE);
        expect(getBottomNavValue('/create/abc')).toBe(BOTTOM_NAV_VALUES.CREATE);
        expect(getBottomNavValue('/edit/abc')).toBe(BOTTOM_NAV_VALUES.CREATE);
        expect(getBottomNavValue('/combine/abc')).toBe(
            BOTTOM_NAV_VALUES.CREATE
        );
    });

    it('maps profile and auth routes to account', () => {
        expect(getBottomNavValue('/profile')).toBe(BOTTOM_NAV_VALUES.ACCOUNT);
        expect(getBottomNavValue('/login')).toBe(BOTTOM_NAV_VALUES.ACCOUNT);
        expect(getBottomNavValue('/signup')).toBe(BOTTOM_NAV_VALUES.ACCOUNT);
    });

    it('is case-insensitive, guarding the /signUp route casing', () => {
        expect(getBottomNavValue('/signUp')).toBe(BOTTOM_NAV_VALUES.ACCOUNT);
    });

    it('returns false for routes with no owning tab', () => {
        expect(getBottomNavValue('/view/abc')).toBe(false);
        expect(getBottomNavValue('/study/abc/flashcards')).toBe(false);
        expect(getBottomNavValue('/nonsense')).toBe(false);
    });
});

describe('isStudyRoute', () => {
    it('matches study routes', () => {
        expect(isStudyRoute('/study/abc/flashcards')).toBe(true);
    });

    it('does not match routes that merely start with "study"', () => {
        expect(isStudyRoute('/studysets')).toBe(false);
    });
});
