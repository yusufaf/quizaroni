// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vite-plus/test';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Studyset } from 'shared/types';
import { useViewSetsStore } from 'state/stores/viewSets';
import StudysetActions from './StudysetActions';

const theme = createTheme();
const ID = '11111111-1111-4111-8111-111111111111';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));

// Mocked wholesale: the real react-router-dom can't load under React 18 here
// (see ImportCardsModal.test.tsx).
vi.mock('react-router-dom', () => ({
    useNavigate: () => vi.fn(),
    useParams: () => ({ id: ID }),
    Link: ({ children }: { children?: React.ReactNode }) => <>{children}</>,
}));

vi.mock('react-toastify', () => ({
    toast: {
        success: vi.fn(),
        error: vi.fn(),
        POSITION: { BOTTOM_LEFT: 'bottom-left' },
    },
}));

vi.mock('theme/useTheme', () => ({
    useTheme: () => ({ muiTheme: createTheme() }),
}));

vi.mock('../PublishDialog/PublishDialog', () => ({
    default: ({ open }) => (open ? <div>publish-dialog</div> : null),
}));

const makeStudyset = (overrides: Partial<Studyset> = {}) =>
    ({
        studysetUUID: ID,
        metadata: { publiclyViewable: false },
        ...overrides,
    }) as unknown as Studyset;

const renderActions = (studyset = makeStudyset()) =>
    render(
        <ThemeProvider theme={theme}>
            <StudysetActions
                updateMetadataField={vi.fn()}
                selectedStudyset={studyset}
            />
        </ThemeProvider>
    );

const openShare = () =>
    fireEvent.click(screen.getByRole('button', { name: 'actions.share' }));

describe('StudysetActions share dialog', () => {
    beforeEach(() => {
        useViewSetsStore.setState({ selectedDialog: '' });
    });

    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('opens the share dialog from the Share button', () => {
        renderActions();
        openShare();

        expect(screen.getByText('dialogs.share.title')).toBeTruthy();
    });

    it('closes the share dialog from its close button', () => {
        renderActions();
        openShare();

        fireEvent.click(
            within(screen.getByRole('dialog')).getByRole('button', { name: 'close' })
        );
        expect(useViewSetsStore.getState().selectedDialog).toBe('');
    });

    it('opens the publish dialog from the share hint when publishing is enabled', () => {
        vi.stubEnv('VITE_FEATURE_PUBLISH', 'true');
        renderActions();
        openShare();

        fireEvent.click(
            within(screen.getByRole('dialog')).getByRole('button', {
                name: 'publish.menuPublish',
            })
        );
        expect(screen.getByText('publish-dialog')).toBeTruthy();
        expect(useViewSetsStore.getState().selectedDialog).toBe('');
    });

    // Stubbed explicitly so a local .env.local with the flag on can't flip it.
    it('offers no publish button in the share dialog while the flag is off', () => {
        vi.stubEnv('VITE_FEATURE_PUBLISH', '');
        renderActions();
        openShare();

        expect(screen.getByText('dialogs.share.notPublished')).toBeTruthy();
        expect(screen.queryByRole('button', { name: 'publish.menuPublish' })).toBeNull();
    });
});
