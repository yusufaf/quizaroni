// @vitest-environment jsdom
import {
    describe,
    it,
    expect,
    vi,
    beforeEach,
    afterEach,
} from 'vite-plus/test';
import { render, screen } from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PublicStudySet from './PublicStudySet';

// #128: the public page now renders the allowlisted payload from
// toPublicStudyset, which has no labels, owner ids or storage keys.

const muiTheme = createTheme();

const ID = '11111111-1111-4111-8111-111111111111';
const NOW = '2026-10-01T12:00:00.000Z';
const TERM_URL = 'https://bucket.s3.amazonaws.com/term.png?X-Amz-Signature=a';
const DEFINITION_URL =
    'https://bucket.s3.amazonaws.com/definition.png?X-Amz-Signature=b';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (k: string) => k }),
}));

// The Save button reads auth itself (#140).
vi.mock('@logto/react', () => ({
    useLogto: () => ({ isAuthenticated: false }),
}));

// Mocked like the other component tests until #102 moves them to MemoryRouter.
vi.mock('react-router-dom', () => {
    const FakeLink = ({
        to,
        state,
        children,
        ...rest
    }: {
        to: string;
        state?: unknown;
        children: React.ReactNode;
    }) => (
        <a href={to} data-state={JSON.stringify(state)} {...rest}>
            {children}
        </a>
    );
    return {
        useParams: () => ({ id: ID }),
        useLocation: () => ({ pathname: `/view/${ID}`, search: '' }),
        Link: FakeLink,
    };
});

const publicSet = (overrides: Record<string, unknown> = {}) => ({
    title: 'Cell biology',
    description: 'Organelles',
    username: 'turtles',
    subject: null,
    publishedAt: null,
    updatedAt: NOW,
    cards: [
        {
            term: 'Mitochondria',
            definition: 'Powerhouse of the cell',
            files: [
                { association: 'term', signedURL: TERM_URL },
                { association: 'definition', signedURL: DEFINITION_URL },
            ],
        },
    ],
    ...overrides,
});

const json = (status: number, body: unknown) =>
    Promise.resolve(
        new Response(JSON.stringify(body), {
            status,
            headers: { 'Content-Type': 'application/json' },
        })
    );

let response: () => Promise<Response>;

const fetchMock = vi.fn((input: RequestInfo | URL) =>
    String(input).endsWith(`/public/studyset/${ID}`)
        ? response()
        : json(404, { message: 'not found' })
);

const renderView = (props: { showSignupCta?: boolean } = {}) => {
    const qc = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });
    return render(
        <ThemeProvider theme={muiTheme}>
            <QueryClientProvider client={qc}>
                <PublicStudySet {...props} />
            </QueryClientProvider>
        </ThemeProvider>
    );
};

describe('PublicStudySet', () => {
    beforeEach(() => {
        fetchMock.mockClear();
        vi.stubGlobal('fetch', fetchMock);
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it('renders card images from their signed URLs', async () => {
        response = () => json(200, { studyset: publicSet() });
        renderView();

        const images = await screen.findAllByRole('img');

        expect(images.map((img) => img.getAttribute('src'))).toEqual([
            TERM_URL,
            DEFINITION_URL,
        ]);
        expect(images.map((img) => img.getAttribute('alt'))).toEqual([
            'publicView.termImage',
            'publicView.definitionImage',
        ]);
    });

    it('sends a logged-out visitor who clicks Save to login and back', async () => {
        response = () => json(200, { studyset: publicSet() });
        renderView();

        const save = await screen.findByRole('link', { name: 'save.action' });

        expect(save.getAttribute('href')).toBe('/login');
        expect(JSON.parse(save.getAttribute('data-state') ?? '{}')).toEqual({
            from: `/view/${ID}`,
        });
    });

    it('does not render labels, even if an old API still sends them', async () => {
        response = () =>
            json(200, { studyset: publicSet({ labels: ['Private folder'] }) });
        renderView();

        await screen.findByText('Cell biology');

        expect(screen.queryByText('Private folder')).toBeNull();
    });

    it('renders no attribution and no validation error for a null username', async () => {
        response = () => json(200, { studyset: publicSet({ username: null }) });
        renderView();

        await screen.findByText('Cell biology');

        expect(screen.queryByText('publicView.createdBy')).toBeNull();
        expect(console.error).not.toHaveBeenCalledWith(
            expect.stringContaining('validation failed'),
            expect.anything()
        );
    });

    it('accepts a null updatedAt from records that predate it', async () => {
        response = () =>
            json(200, { studyset: publicSet({ updatedAt: null }) });
        renderView();

        await screen.findByText('Cell biology');

        expect(console.error).not.toHaveBeenCalledWith(
            expect.stringContaining('validation failed'),
            expect.anything()
        );
    });

    it('offers a Report link that mails the set id', async () => {
        response = () => json(200, { studyset: publicSet() });
        renderView();

        const report = await screen.findByRole('link', {
            name: 'report.action',
        });

        expect(report.getAttribute('href')).toMatch(/^mailto:/);
        expect(report.getAttribute('href')).toContain(ID);
    });

    it('shows the sign-up call to action by default', async () => {
        response = () => json(200, { studyset: publicSet() });
        renderView();

        await screen.findByText('Cell biology');

        const cta = screen.getByText('publicView.ctaButton').closest('a');
        expect(cta?.getAttribute('href')).toBe('/signUp');
        // Sign-up comes back to this set (#139).
        expect(cta?.getAttribute('data-state')).toBe(
            JSON.stringify({ from: `/view/${ID}` })
        );
    });

    it('hides the sign-up call to action when showSignupCta is false', async () => {
        response = () => json(200, { studyset: publicSet() });
        renderView({ showSignupCta: false });

        await screen.findByText('Cell biology');

        expect(screen.queryByText('publicView.ctaButton')).toBeNull();
        expect(screen.queryByText('publicView.ctaTitle')).toBeNull();
    });
});
