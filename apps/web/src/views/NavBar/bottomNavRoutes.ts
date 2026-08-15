export const BOTTOM_NAV_VALUES = {
    HOME: 'home',
    EXPLORE: 'explore',
    CREATE: 'create',
    ACCOUNT: 'account',
} as const;

export type BottomNavValue =
    (typeof BOTTOM_NAV_VALUES)[keyof typeof BOTTOM_NAV_VALUES];

/**
 * Derives the selected bottom-nav tab from the URL. Nested/detail routes
 * roll up to the destination that owns them (`/edit/:id` -> Create). Routes
 * with no owning tab (`/view/:id`, `/study/*`, 404) return false so nothing
 * is highlighted.
 */
export const getBottomNavValue = (pathname: string): BottomNavValue | false => {
    const path = pathname.toLowerCase();

    if (path === '/') return BOTTOM_NAV_VALUES.HOME;
    if (path.startsWith('/explore')) return BOTTOM_NAV_VALUES.EXPLORE;
    if (
        path.startsWith('/create') ||
        path.startsWith('/edit/') ||
        path.startsWith('/combine/')
    ) {
        return BOTTOM_NAV_VALUES.CREATE;
    }
    if (
        path.startsWith('/profile') ||
        path.startsWith('/login') ||
        path.startsWith('/signup')
    ) {
        return BOTTOM_NAV_VALUES.ACCOUNT;
    }

    return false;
};
