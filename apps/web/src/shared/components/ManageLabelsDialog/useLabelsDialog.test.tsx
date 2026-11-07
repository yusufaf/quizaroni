// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vite-plus/test';
import { renderHook, act } from '@testing-library/react';
import { useGlobalStore } from 'state/stores/global';
import { useLabelsDialog } from './useLabelsDialog';

// Renaming a label that a set uses goes through the cascade preview; the
// confirm step must send the rename the preview was opened for.

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

const { mutations, mutation } = vi.hoisted(() => ({
    mutations: {
        create: vi.fn(),
        edit: vi.fn(),
        delete: vi.fn(),
        assign: vi.fn(),
    },
    mutation: (mutate: () => void) => () => ({
        mutate,
        isPending: false,
        isSuccess: false,
        isError: false,
    }),
}));

vi.mock('state/api/studysetsAPI', () => ({
    useCreateLabel: mutation(mutations.create),
    useEditLabel: mutation(mutations.edit),
    useDeleteLabel: mutation(mutations.delete),
    useBatchUpdateStudysetLabels: mutation(mutations.assign),
    useGetAllStudysets: () => ({
        data: {
            studysets: [
                { studysetUUID: 's1', title: 'Bio set', labels: ['Old'] },
            ],
        },
    }),
    useGetStudyset: () => ({ data: undefined }),
}));

vi.mock('state/api/usersAPI', () => ({
    useGetUser: () => ({
        data: { user: { labels: ['Old', 'Unused'], userUUID: 'u' } },
    }),
}));

beforeEach(() => {
    vi.clearAllMocks();
    useGlobalStore.getState().setLabelsDialogProps({ open: true });
});

describe('useLabelsDialog rename', () => {
    it('renames an in-use label once the preview is confirmed', () => {
        const { result } = renderHook(() => useLabelsDialog());

        act(() => result.current.handleEdit(0, ' New '));

        expect(result.current.showCascadePreview).toBe(true);
        expect(result.current.cascadeAction).toBe('edit');
        expect(mutations.edit).not.toHaveBeenCalled();
        expect(result.current.affectedItems.map((i) => i.name)).toEqual([
            'Bio set',
        ]);

        act(() => result.current.handleConfirmCascade());

        expect(mutations.edit).toHaveBeenCalledExactlyOnceWith({
            index: 0,
            oldLabel: 'Old',
            newLabel: 'New',
        });
    });

    it('renames an unused label straight away', () => {
        const { result } = renderHook(() => useLabelsDialog());

        act(() => result.current.handleEdit(1, 'Other'));

        expect(result.current.showCascadePreview).toBe(false);
        expect(mutations.edit).toHaveBeenCalledExactlyOnceWith({
            index: 1,
            oldLabel: 'Unused',
            newLabel: 'Other',
        });
    });

    it('treats a name that only adds spaces as no change', () => {
        const { result } = renderHook(() => useLabelsDialog());

        act(() => result.current.handleEdit(0, 'Old '));

        expect(result.current.showCascadePreview).toBe(false);
        expect(mutations.edit).not.toHaveBeenCalled();
    });

    it('sends nothing once the preview is closed', () => {
        const { result } = renderHook(() => useLabelsDialog());

        act(() => result.current.handleEdit(0, 'New'));
        act(() => result.current.handleCloseCascadePreview());
        act(() => result.current.handleConfirmCascade());

        expect(mutations.edit).not.toHaveBeenCalled();
    });
});
