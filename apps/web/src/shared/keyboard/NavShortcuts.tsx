import { useNavigate } from 'react-router-dom';
import { useShortcuts } from './useShortcuts';

/** Mounted only on non-study routes (see App.tsx). Registers nav shortcuts. */
export function NavShortcuts() {
    const navigate = useNavigate();

    useShortcuts([
        {
            id: 'nav.create',
            keys: ['c'],
            scope: 'nav',
            descriptionKey: 'shortcuts.actions.create',
            handler: () => navigate('/create'),
        },
        {
            id: 'nav.search',
            keys: ['/'],
            scope: 'nav',
            descriptionKey: 'shortcuts.actions.search',
            handler: () => {
                const el = document.querySelector<HTMLInputElement>(
                    '[data-shortcut-search]'
                );
                el?.focus();
            },
        },
        {
            id: 'nav.home',
            keys: ['g h'],
            scope: 'nav',
            descriptionKey: 'shortcuts.actions.goHome',
            handler: () => navigate('/'),
        },
        {
            id: 'nav.explore',
            keys: ['g e'],
            scope: 'nav',
            descriptionKey: 'shortcuts.actions.goExplore',
            handler: () => navigate('/explore'),
        },
    ]);

    return null;
}
