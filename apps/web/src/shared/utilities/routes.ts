/**
 * Study is a full-screen focus surface: app-level nav chrome (keyboard
 * shortcuts, the mobile bottom nav) is suppressed while it's active.
 */
export const isStudyRoute = (pathname: string) =>
    pathname.startsWith('/study/');
