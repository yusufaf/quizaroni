// @vitest-environment jsdom
import {
    describe,
    it,
    expect,
    vi,
    beforeEach,
    afterEach,
} from 'vite-plus/test';
import {
    render,
    screen,
    fireEvent,
    waitFor,
    within,
    act,
} from '@testing-library/react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import {
    QueryClient,
    QueryClientProvider,
    useQuery,
} from '@tanstack/react-query';
import { Studyset } from 'shared/types';
import en from 'i18n/locales/en/common.json';
import es from 'i18n/locales/es/common.json';
import ManageCategoriesDialog from './ManageCategoriesDialog';

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (k: string, o?: object) => (o ? `${k} ${JSON.stringify(o)}` : k),
    }),
}));

const toastMock = vi.hoisted(() => ({
    warning: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    POSITION: { BOTTOM_LEFT: 'bottom-left' },
}));
vi.mock('react-toastify', () => ({ toast: toastMock }));

const card = (cardUUID: string, categories: string[]) => ({
    cardUUID,
    term: `term-${cardUUID}`,
    definition: `def-${cardUUID}`,
    categories,
});

const fixture = {
    studysetUUID: 'set-1',
    title: 'Set',
    categories: ['used', 'unused'],
    cards: [card('c1', ['used']), card('c2', [])],
} as unknown as Studyset;

const otherSet = {
    studysetUUID: 'set-9',
    title: 'Other set',
    createdAt: '2026-01-01T00:00:00.000Z',
    categories: ['imported'],
    cards: [],
} as unknown as Studyset;

const ok = () =>
    new Response(JSON.stringify({ message: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
    });
const fail = () => new Response('boom', { status: 500 });

const deferred = <T,>() => {
    let resolve!: (value: T) => void;
    const promise = new Promise<T>((r) => (resolve = r));
    return { promise, resolve };
};

const fetchMock = vi.fn();
const updateCalls = () =>
    fetchMock.mock.calls.filter(([url]) =>
        String(url).includes('/update-studyset')
    );
const updateBody = (i: number) =>
    JSON.parse(updateCalls()[i]![1].body as string).updates;
const cardCategories = (i: number, cardUUID: string) =>
    updateBody(i).cards.find(
        (c: { cardUUID: string }) => c.cardUUID === cardUUID
    ).categories;

const newClient = () =>
    new QueryClient({
        defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
        },
    });

const renderDialog = ({
    studyset = fixture,
    onClose = vi.fn(),
    qc = newClient(),
}: { studyset?: Studyset; onClose?: () => void; qc?: QueryClient } = {}) => {
    const ui = (s: Studyset) => (
        <QueryClientProvider client={qc}>
            <ThemeProvider theme={createTheme()}>
                <ManageCategoriesDialog
                    open
                    onClose={onClose}
                    selectedStudyset={s}
                    studysets={[s, otherSet]}
                />
            </ThemeProvider>
        </QueryClientProvider>
    );
    const result = render(ui(studyset));
    return {
        ...result,
        qc,
        onClose,
        rerenderWith: (s: Studyset) => result.rerender(ui(s)),
    };
};

const wait = (ms: number) =>
    act(() => new Promise<void>((r) => setTimeout(r, ms)));

const isDisabled = (el: HTMLElement) => (el as HTMLButtonElement).disabled;
const isAriaDisabled = (el: HTMLElement) =>
    el.getAttribute('aria-disabled') === 'true';

const button = (name: string | RegExp) => screen.getByRole('button', { name });
const deleteUnusedButton = () => button('categories.deleteUnused');
const cardSelect = () =>
    screen.getByRole('combobox', {
        name: 'categories.selectCard',
        hidden: true,
    });
const categorySelect = () =>
    screen.getByRole('combobox', {
        name: 'categories.assignCategories',
        hidden: true,
    });

const openTab = (name: string) =>
    fireEvent.click(screen.getByRole('tab', { name: `categories.${name}` }));

const lastListbox = () => screen.getAllByRole('listbox').at(-1)!;

const pickOption = (select: HTMLElement, option: string | RegExp) => {
    fireEvent.mouseDown(select);
    fireEvent.click(within(lastListbox()).getByText(option));
};

const pickCard = (cardUUID: string) =>
    pickOption(cardSelect(), new RegExp(`term-${cardUUID}`));

const openCategoryMenu = () => fireEvent.mouseDown(categorySelect());
// Clicks an option in the open category menu.
const toggleCategory = (category: string) =>
    fireEvent.click(within(lastListbox()).getByText(category));

describe('ManageCategoriesDialog', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        fetchMock.mockReset();
        vi.stubGlobal('fetch', fetchMock);
    });
    afterEach(() => vi.unstubAllGlobals());

    describe('failed saves show an error (#113)', () => {
        it('Create: toasts, keeps the typed name and re-enables the button', async () => {
            fetchMock.mockImplementation(() => Promise.resolve(fail()));
            renderDialog();
            fireEvent.change(screen.getByLabelText('categories.categoryName'), {
                target: { value: 'new' },
            });
            fireEvent.click(button('categories.create'));

            await waitFor(() =>
                expect(toastMock.error).toHaveBeenCalledWith(
                    'categories.createFailed'
                )
            );
            await wait(50);
            expect(toastMock.error).toHaveBeenCalledTimes(1);
            expect(
                (
                    screen.getByLabelText(
                        'categories.categoryName'
                    ) as HTMLInputElement
                ).value
            ).toBe('new');
            expect(isDisabled(button('categories.create'))).toBe(false);
        });

        it('Rename: toasts and leaves the row in edit mode', async () => {
            fetchMock.mockImplementation(() => Promise.resolve(fail()));
            renderDialog();
            fireEvent.click(screen.getAllByTitle('Edit')[0]!);
            const input = screen.getByDisplayValue('used');
            fireEvent.change(input, { target: { value: 'renamed' } });
            fireEvent.keyDown(input, { key: 'Enter' });

            await waitFor(() =>
                expect(toastMock.error).toHaveBeenCalledWith(
                    'categories.renameFailed'
                )
            );
            await wait(50);
            expect(screen.getByTitle('Save')).toBeTruthy();
            expect(isDisabled(deleteUnusedButton())).toBe(false);
        });

        it('Delete Selected: toasts and re-enables the controls', async () => {
            fetchMock.mockImplementation(() => Promise.resolve(fail()));
            renderDialog();
            fireEvent.click(screen.getAllByTitle('Mark for deletion')[1]!);
            fireEvent.click(button('categories.delete'));

            await waitFor(() =>
                expect(toastMock.error).toHaveBeenCalledWith(
                    'categories.deleteFailed'
                )
            );
            await wait(50);
            expect(isDisabled(deleteUnusedButton())).toBe(false);
        });

        it('Import from a set: toasts and re-enables the button', async () => {
            fetchMock.mockImplementation(() => Promise.resolve(fail()));
            renderDialog();
            openTab('import');
            pickOption(
                screen.getByRole('combobox', {
                    name: 'categories.selectStudyset',
                }),
                'Other set'
            );
            fireEvent.click(button(/categories.importCount/));

            await waitFor(() =>
                expect(toastMock.error).toHaveBeenCalledWith(
                    'categories.importFailed'
                )
            );
            await wait(50);
            expect(isDisabled(button(/categories.importCount/))).toBe(false);
        });
    });

    describe('overlapping saves keep their own error handling (#113)', () => {
        it('a Delete Unused failure still toasts and unlocks the Assign selects', async () => {
            const held = deferred<Response>();
            fetchMock.mockImplementationOnce(() => held.promise);
            renderDialog();

            openTab('assign');
            pickCard('c1');
            openTab('manage');
            fireEvent.click(deleteUnusedButton());
            await waitFor(() => expect(updateCalls()).toHaveLength(1));

            openTab('assign');
            expect(isAriaDisabled(cardSelect())).toBe(true);
            expect(isAriaDisabled(categorySelect())).toBe(true);

            await act(async () => {
                held.resolve(fail());
                await new Promise((r) => setTimeout(r, 50));
            });

            expect(toastMock.error).toHaveBeenCalledWith(
                'categories.deleteUnusedFailed'
            );
            expect(isAriaDisabled(cardSelect())).toBe(false);
            expect(isAriaDisabled(categorySelect())).toBe(false);
            openTab('manage');
            expect(isDisabled(deleteUnusedButton())).toBe(false);
        });

        it('a failed assign still toasts when another pick is already waiting', async () => {
            const held = deferred<Response>();
            fetchMock
                .mockImplementationOnce(() => held.promise)
                .mockImplementation(() => Promise.resolve(ok()));
            renderDialog();

            openTab('assign');
            pickCard('c1');
            openCategoryMenu();
            toggleCategory('unused'); // A: ['used', 'unused']
            await waitFor(() => expect(updateCalls()).toHaveLength(1), {
                timeout: 2000,
            });
            toggleCategory('used'); // B: ['unused'], picked in the open menu

            await act(async () => {
                held.resolve(fail());
                await new Promise((r) => setTimeout(r, 50));
            });

            expect(toastMock.error).toHaveBeenCalledWith(
                'categories.assignFailed'
            );
            // Not reverted to the saved ['used']: B is still waiting to save.
            expect(categorySelect().textContent).toBe('unused');
            await waitFor(() => expect(updateCalls()).toHaveLength(2), {
                timeout: 2000,
            });
            expect(cardCategories(1, 'c1')).toEqual(['unused']);
        });
    });

    describe('Assign autosave', () => {
        const pickUnusedOnC1 = () => {
            openTab('assign');
            pickCard('c1');
            openCategoryMenu();
            toggleCategory('unused'); // ['used', 'unused']
            fireEvent.keyDown(lastListbox(), { key: 'Escape' });
        };

        it('reverts the selection and toasts when the save fails', async () => {
            fetchMock.mockImplementation(() => Promise.resolve(fail()));
            renderDialog();
            pickUnusedOnC1();
            expect(
                screen.getByText('categories.categoriesAssigned {"count":2}')
            ).toBeTruthy();

            await waitFor(
                () =>
                    expect(toastMock.error).toHaveBeenCalledWith(
                        'categories.assignFailed'
                    ),
                { timeout: 2000 }
            );
            await wait(50);
            expect(
                screen.getByText('categories.categoriesAssigned {"count":1}')
            ).toBeTruthy();
            expect(categorySelect().textContent).toBe('used');
        });

        it('saves the pending pick for the card it was made on before switching cards', async () => {
            const held = deferred<Response>();
            fetchMock.mockImplementationOnce(() => held.promise);
            renderDialog();
            pickUnusedOnC1();
            pickCard('c2');

            await waitFor(() => expect(updateCalls()).toHaveLength(1), {
                timeout: 200,
            });
            expect(cardCategories(0, 'c1')).toEqual(['used', 'unused']);
            expect(cardCategories(0, 'c2')).toEqual([]);
            expect(isAriaDisabled(cardSelect())).toBe(true);

            await act(async () => {
                held.resolve(ok());
                await new Promise((r) => setTimeout(r, 50));
            });
            expect(isAriaDisabled(cardSelect())).toBe(false);
        });

        it('saves the pending pick straight away on a tab change', async () => {
            const held = deferred<Response>();
            fetchMock.mockImplementationOnce(() => held.promise);
            renderDialog();
            pickUnusedOnC1();
            openTab('manage');

            await waitFor(() => expect(updateCalls()).toHaveLength(1), {
                timeout: 200,
            });
            expect(isDisabled(deleteUnusedButton())).toBe(true);

            await act(async () => {
                held.resolve(ok());
                await new Promise((r) => setTimeout(r, 50));
            });
            expect(isDisabled(deleteUnusedButton())).toBe(false);
        });

        it('saves the pending pick straight away when the dialog closes', async () => {
            fetchMock.mockImplementation(() => Promise.resolve(ok()));
            const { onClose } = renderDialog();
            pickUnusedOnC1();
            fireEvent.click(screen.getByLabelText('close'));

            await waitFor(() => expect(updateCalls()).toHaveLength(1), {
                timeout: 200,
            });
            expect(cardCategories(0, 'c1')).toEqual(['used', 'unused']);
            expect(onClose).toHaveBeenCalled();
        });

        it('shows new server data for the selected card', () => {
            const { rerenderWith } = renderDialog();
            openTab('assign');
            pickCard('c1');
            rerenderWith({
                ...fixture,
                cards: [card('c1', ['used', 'unused']), card('c2', [])],
            } as unknown as Studyset);

            expect(
                screen.getByText('categories.categoriesAssigned {"count":2}')
            ).toBeTruthy();
        });

        it('saves a pending pick on unmount when nothing else is saving', async () => {
            fetchMock.mockImplementation(() => Promise.resolve(ok()));
            const { unmount } = renderDialog();
            pickUnusedOnC1();
            unmount();

            await waitFor(() => expect(updateCalls()).toHaveLength(1), {
                timeout: 200,
            });
            expect(cardCategories(0, 'c1')).toEqual(['used', 'unused']);
        });

        it('drops a pending pick on unmount while another save is in flight', async () => {
            const held = deferred<Response>();
            fetchMock.mockImplementationOnce(() => held.promise);
            const { unmount } = renderDialog();
            openTab('assign');
            pickCard('c1');
            openCategoryMenu();
            toggleCategory('unused');
            await waitFor(() => expect(updateCalls()).toHaveLength(1), {
                timeout: 2000,
            });
            toggleCategory('used'); // picked in the open menu during the save
            unmount();
            await wait(600);

            expect(updateCalls()).toHaveLength(1);
            expect(toastMock.error).toHaveBeenCalledWith(
                'categories.assignFailed'
            );
        });

        it('drops a pending pick when the dialog switches to another set', async () => {
            fetchMock.mockImplementation(() => Promise.resolve(ok()));
            const { rerenderWith } = renderDialog();
            pickUnusedOnC1();
            rerenderWith({
                studysetUUID: 'set-2',
                title: 'Set 2',
                categories: [],
                cards: [card('x1', [])],
            } as unknown as Studyset);
            await wait(600);

            expect(updateCalls()).toHaveLength(0);
            expect(toastMock.error).toHaveBeenCalledWith(
                'categories.assignFailed'
            );
            expect(
                screen.getByText('categories.noCategoriesAssigned')
            ).toBeTruthy();
        });
    });

    describe('stale data', () => {
        const renderFromQuery = (
            qc: QueryClient,
            queryFn: () => Promise<{ studyset: Studyset }>
        ) => {
            const Harness = () => {
                const { data } = useQuery({
                    queryKey: ['studysets', 'set-1'],
                    queryFn,
                    staleTime: Infinity,
                });
                return (
                    <ManageCategoriesDialog
                        open
                        onClose={vi.fn()}
                        selectedStudyset={data!.studyset}
                        studysets={[]}
                    />
                );
            };
            return render(
                <QueryClientProvider client={qc}>
                    <ThemeProvider theme={createTheme()}>
                        <Harness />
                    </ThemeProvider>
                </QueryClientProvider>
            );
        };

        it('keeps controls disabled until the refetch after a save lands', async () => {
            fetchMock.mockImplementation(() => Promise.resolve(ok()));
            const qc = newClient();
            qc.setQueryData(['studysets', 'set-1'], { studyset: fixture });
            const refetch = deferred<{ studyset: Studyset }>();
            renderFromQuery(qc, () => refetch.promise);

            fireEvent.click(deleteUnusedButton());
            await waitFor(() => expect(updateCalls()).toHaveLength(1));
            await wait(50);
            expect(isDisabled(deleteUnusedButton())).toBe(true);

            await act(async () => {
                refetch.resolve({
                    studyset: { ...fixture, categories: ['used'] },
                });
                await new Promise((r) => setTimeout(r, 50));
            });
            expect(isDisabled(deleteUnusedButton())).toBe(false);
            expect(screen.queryByText('unused')).toBeNull();
        });

        it('ignores Enter while the cache is newer than the shown set', async () => {
            fetchMock.mockImplementation(() => Promise.resolve(ok()));
            const { qc } = renderDialog();
            qc.setQueryData(['studysets', 'set-1'], {
                studyset: { ...fixture, categories: ['used'] },
            });
            const input = screen.getByLabelText('categories.categoryName');
            fireEvent.change(input, { target: { value: 'new' } });
            fireEvent.keyDown(input, { key: 'Enter' });
            await wait(50);

            expect(updateCalls()).toHaveLength(0);
        });

        it('keeps a name typed while the create save was in flight', async () => {
            const held = deferred<Response>();
            fetchMock.mockImplementationOnce(() => held.promise);
            renderDialog();
            const input = screen.getByLabelText(
                'categories.categoryName'
            ) as HTMLInputElement;
            fireEvent.change(input, { target: { value: 'first' } });
            fireEvent.keyDown(input, { key: 'Enter' });
            await waitFor(() => expect(updateCalls()).toHaveLength(1));
            fireEvent.change(input, { target: { value: 'second' } });

            await act(async () => {
                held.resolve(ok());
                await new Promise((r) => setTimeout(r, 50));
            });
            expect(input.value).toBe('second');
        });

        it('rechecks a typed name when the category list changes', () => {
            const { rerenderWith } = renderDialog();
            fireEvent.change(screen.getByLabelText('categories.categoryName'), {
                target: { value: 'dup' },
            });
            expect(
                screen.queryByText('categories.categoryAlreadyExists')
            ).toBeNull();

            rerenderWith({
                ...fixture,
                categories: ['used', 'unused', 'dup'],
            } as unknown as Studyset);
            expect(
                screen.getByText('categories.categoryAlreadyExists')
            ).toBeTruthy();
        });

        it('sends one save for a double Enter and locks Delete Selected meanwhile', async () => {
            const held = deferred<Response>();
            fetchMock.mockImplementationOnce(() => held.promise);
            renderDialog();
            fireEvent.click(screen.getAllByTitle('Mark for deletion')[1]!);
            const input = screen.getByLabelText('categories.categoryName');
            fireEvent.change(input, { target: { value: 'new' } });
            fireEvent.keyDown(input, { key: 'Enter' });
            fireEvent.keyDown(input, { key: 'Enter' });
            await wait(50);

            expect(updateCalls()).toHaveLength(1);
            expect(isDisabled(button('categories.delete'))).toBe(true);

            await act(async () => {
                held.resolve(ok());
                await new Promise((r) => setTimeout(r, 50));
            });
        });
    });

    describe('strings', () => {
        const flatKeys = (obj: object, prefix = ''): string[] =>
            Object.entries(obj).flatMap(([key, value]) =>
                typeof value === 'object' && value !== null
                    ? flatKeys(value, `${prefix}${key}.`)
                    : [`${prefix}${key}`]
            );

        it('has the same categories keys in en and es', () => {
            expect(flatKeys(es.categories).sort()).toEqual(
                flatKeys(en.categories).sort()
            );
        });

        it.each([
            'createFailed',
            'renameFailed',
            'deleteFailed',
            'assignFailed',
            'importFailed',
            'deleteUnusedFailed',
        ])('has a non-empty %s message in en and es', (key) => {
            const enCategories: Record<string, unknown> = en.categories;
            const esCategories: Record<string, unknown> = es.categories;
            expect(enCategories[key]).toEqual(expect.any(String));
            expect(enCategories[key]).not.toBe('');
            expect(esCategories[key]).toEqual(expect.any(String));
            expect(esCategories[key]).not.toBe('');
        });
    });
});
