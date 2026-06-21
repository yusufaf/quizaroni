import { useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Box,
    Typography,
    Stack,
} from '@mui/material';
import { useTranslation } from 'react-i18next';
import { useShortcuts } from './useShortcuts';
import { useShortcutRegistry } from './ShortcutRegistry';
import type { ScopeId, Shortcut } from './shortcutTypes';

const SCOPE_ORDER: ScopeId[] = [
    'global',
    'nav',
    'study:flashcards',
    'study:mc',
    'study:typewrite',
    'study:matching',
];

const Kbd = ({ children }: { children: string }) => (
    <Box
        component="kbd"
        sx={{
            px: 0.75,
            py: 0.25,
            mx: 0.25,
            borderRadius: 1,
            border: '1px solid',
            borderColor: 'divider',
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            bgcolor: 'action.hover',
        }}
    >
        {children}
    </Box>
);

const prettyKey = (k: string): string =>
    k === ' '
        ? 'Space'
        : k
              .replace('ArrowLeft', '←')
              .replace('ArrowRight', '→')
              .replace('ArrowUp', '↑')
              .replace('ArrowDown', '↓');

export function ShortcutHelpModal() {
    const { t } = useTranslation('common');
    const [open, setOpen] = useState(false);
    const reg = useShortcutRegistry();

    useShortcuts([
        {
            id: 'global.help',
            keys: ['?'],
            scope: 'global',
            descriptionKey: 'shortcuts.actions.help',
            handler: () => setOpen((o) => !o),
        },
        {
            id: 'global.escape',
            keys: ['Escape'],
            scope: 'global',
            descriptionKey: 'shortcuts.actions.escape',
            handler: () => setOpen(false),
            when: () => open,
        },
    ]);

    // reg.version referenced so the list re-reads when bindings change.
    void reg.version;
    const active = reg.getActive().filter((s) => (s.when ? s.when() : true));
    const byScope = SCOPE_ORDER.map((scope) => ({
        scope,
        items: active.filter((s) => s.scope === scope),
    })).filter((g) => g.items.length > 0);

    return (
        <Dialog
            open={open}
            onClose={() => setOpen(false)}
            maxWidth="sm"
            fullWidth
        >
            <DialogTitle>{t('shortcuts.title')}</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2}>
                    {byScope.map((group) => (
                        <Box key={group.scope}>
                            <Typography variant="subtitle2" gutterBottom>
                                {t(`shortcuts.scopes.${group.scope}`)}
                            </Typography>
                            {group.items.map((s: Shortcut) => (
                                <Box
                                    key={s.id}
                                    sx={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        py: 0.5,
                                    }}
                                >
                                    <Typography variant="body2">
                                        {t(s.descriptionKey)}
                                    </Typography>
                                    <Box>
                                        {s.keys.map((k) => (
                                            <Kbd key={k}>
                                                {k
                                                    .split(' ')
                                                    .map(prettyKey)
                                                    .join(' ')}
                                            </Kbd>
                                        ))}
                                    </Box>
                                </Box>
                            ))}
                        </Box>
                    ))}
                </Stack>
            </DialogContent>
        </Dialog>
    );
}
