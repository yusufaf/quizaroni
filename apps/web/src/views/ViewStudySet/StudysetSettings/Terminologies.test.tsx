// @vitest-environment jsdom
import {
    describe,
    it,
    expect,
    vi,
    beforeEach,
    afterEach,
} from 'vite-plus/test';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Studyset } from 'shared/types';
import FormatTerminologies from './FormatTerminologies';
import LabelTerminologies from './LabelTerminologies';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));

const toastMock = vi.hoisted(() => ({
    warning: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    POSITION: { BOTTOM_LEFT: 'bottom-left' },
}));
vi.mock('react-toastify', () => ({ toast: toastMock }));

const ID = '11111111-1111-4111-8111-111111111111';
const OWNER = '33333333-3333-4333-8333-333333333333';
const NOW = '2026-10-01T12:00:00.000Z';

const customSet = {
    cards: [],
    categories: [],
    createdAt: NOW,
    description: '',
    favorited: false,
    labels: [],
    lastViewed: NOW,
    metadata: {
        backgroundColorVisible: false,
        cardCountVisible: true,
        contentOnly: false,
        customLabelTerminology: 'Item',
        customTerminology: 'Front/Back',
        labelTerminology: 'Custom',
        notesDrawerInitial: 'open',
        notesDrawerPosition: 'right',
        publiclyViewable: false,
        terminology: 'Custom',
        textColorVisible: false,
    },
    studysetUUID: ID,
    title: 'Biology Basics',
    username: 'owner',
    userUUID: OWNER,
    uuid: ID,
};

const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });

// Holds each save open so a test can check the UI before the server answers.
let respond: (response: Response) => void = () => {};
const fetchMock = vi.fn(
    () => new Promise<Response>((resolve) => (respond = resolve))
);

const renderWith = (ui: React.ReactElement) => {
    const qc = new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });
    render(
        <QueryClientProvider client={qc}>
            <ThemeProvider theme={createTheme()}>{ui}</ThemeProvider>
        </QueryClientProvider>
    );
};

const studyset = customSet as unknown as Studyset;

describe('custom terminology saves', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.stubGlobal('fetch', fetchMock);
    });

    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('shows no saved chip and a toast when a format terminology save fails', async () => {
        renderWith(<FormatTerminologies studyset={studyset} />);

        fireEvent.change(screen.getByLabelText('studysetSettings.firstTerm'), {
            target: { value: 'Q' },
        });
        await waitFor(() => expect(fetchMock).toHaveBeenCalled(), {
            timeout: 2000,
        });
        expect(screen.queryByText('studysetSettings.saved')).toBeNull();

        respond(json(500, { message: 'boom' }));

        await waitFor(() =>
            expect(toastMock.error).toHaveBeenCalledWith(
                'errors.saveFailed',
                expect.anything()
            )
        );
        expect(screen.queryByText('studysetSettings.saved')).toBeNull();
    });

    it('shows the saved chip once the server confirms a format terminology save', async () => {
        renderWith(<FormatTerminologies studyset={studyset} />);

        fireEvent.change(screen.getByLabelText('studysetSettings.firstTerm'), {
            target: { value: 'Q' },
        });
        await waitFor(() => expect(fetchMock).toHaveBeenCalled(), {
            timeout: 2000,
        });
        expect(screen.queryByText('studysetSettings.saved')).toBeNull();

        respond(json(200, { message: 'ok', studyset: customSet }));

        expect(await screen.findByText('studysetSettings.saved')).toBeTruthy();
    });

    it('shows no saved chip and a toast when a label terminology save fails', async () => {
        renderWith(<LabelTerminologies studyset={studyset} />);

        fireEvent.change(
            screen.getByLabelText('studysetSettings.customTerminology'),
            { target: { value: 'Entry' } }
        );
        await waitFor(() => expect(fetchMock).toHaveBeenCalled(), {
            timeout: 2000,
        });
        expect(screen.queryByText('studysetSettings.saved')).toBeNull();

        respond(json(500, { message: 'boom' }));

        await waitFor(() =>
            expect(toastMock.error).toHaveBeenCalledWith(
                'errors.saveFailed',
                expect.anything()
            )
        );
        expect(screen.queryByText('studysetSettings.saved')).toBeNull();
    });
});
