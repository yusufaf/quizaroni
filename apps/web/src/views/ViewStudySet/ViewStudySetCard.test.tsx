// @vitest-environment jsdom
import {
    afterEach,
    beforeEach,
    describe,
    expect,
    it,
    vi,
} from 'vite-plus/test';
import { cleanup, render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DEFAULT_USER_RESPONSE, EMPTY_CARD } from 'shared/constants';
import type { Studyset } from 'shared/types';
import ViewStudySetCard from './ViewStudySetCard';

const muiTheme = createTheme();

const ai = vi.hoisted(() => ({
    enabled: vi.fn<() => boolean | undefined>(),
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));
vi.mock('theme/useTheme', () => ({ useTheme: () => ({ muiTheme }) }));
vi.mock('state/api/aiAPI', () => ({ useAIChatEnabled: ai.enabled }));
vi.mock('state/api/usersAPI', () => ({
    useGetUser: () => ({ data: DEFAULT_USER_RESPONSE }),
}));
vi.mock('state/api/studysetsAPI', () => ({
    useUpdateStudyset: () => ({ mutate: vi.fn() }),
}));
vi.mock('hooks/useSpeechSynthesis', () => ({
    default: () => ({ cancel: vi.fn(), speak: vi.fn() }),
}));
vi.mock('@dnd-kit/sortable', () => ({
    useSortable: () => ({
        attributes: {},
        listeners: {},
        setNodeRef: () => {},
        transform: null,
        transition: undefined,
        isDragging: false,
    }),
}));
vi.mock('components/ImageGallery/ImageGallery', () => ({
    default: () => null,
}));
vi.mock('./CategoriesPopover', () => ({ default: () => null }));

const studyset = {
    cards: [],
    categories: [],
    createdAt: '2026-10-01T12:00:00.000Z',
    description: '',
    favorited: false,
    labels: [],
    lastViewed: '2026-10-01T12:00:00.000Z',
    metadata: {
        backgroundColorVisible: false,
        cardCountVisible: true,
        contentOnly: false,
        customLabelTerminology: '',
        customTerminology: '',
        labelTerminology: 'Card',
        notesDrawerInitial: 'open',
        notesDrawerPosition: 'right',
        publiclyViewable: false,
        terminology: 'Term/Definition',
        textColorVisible: false,
    },
    studysetUUID: '11111111-1111-4111-8111-111111111111',
    title: 'Owned set',
    username: 'owner',
    userUUID: '33333333-3333-4333-8333-333333333333',
} as unknown as Studyset;

const renderCard = () =>
    render(
        <QueryClientProvider client={new QueryClient()}>
            <ThemeProvider theme={muiTheme}>
                <ViewStudySetCard
                    card={{ ...EMPTY_CARD, term: 'T', definition: 'D' }}
                    index={0}
                    selectedStudyset={studyset}
                />
            </ThemeProvider>
        </QueryClientProvider>
    );

beforeEach(() => {
    vi.stubGlobal('speechSynthesis', {
        cancel: vi.fn(),
        speak: vi.fn(),
        getVoices: () => [],
    });
});

afterEach(() => {
    // Unmount first: the card's cleanup calls speechSynthesis.cancel().
    cleanup();
    vi.unstubAllGlobals();
});

describe('ViewStudySetCard explain button', () => {
    it('is shown when AI chat is on', () => {
        ai.enabled.mockReturnValue(true);
        renderCard();
        expect(
            screen.getByRole('button', { name: 'aiChat.actions.explainCard' })
        ).toBeTruthy();
    });

    it.each([false, undefined])('is hidden when the status is %s', (value) => {
        ai.enabled.mockReturnValue(value);
        renderCard();
        expect(
            screen.queryByRole('button', { name: 'aiChat.actions.explainCard' })
        ).toBeNull();
        expect(
            screen.getByRole('button', { name: 'common:viewStudySet.playTts' })
        ).toBeTruthy();
    });
});
