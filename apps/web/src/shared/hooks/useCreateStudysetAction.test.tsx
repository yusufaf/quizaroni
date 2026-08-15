// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCreateStudysetAction } from './useCreateStudysetAction';
import { useGlobalStore } from 'state/stores/global';

// react-router-dom is mocked wholesale rather than partially (vi.importActual)
// because this repo's react-router-dom@7 currently resolves an internal
// react-router@8 dependency that requires a React 19 export (useOptimistic)
// not present in this app's React 18 - loading the real package throws in
// the jsdom test environment. Only the hooks this file actually uses are
// stubbed.
const navigateSpy = vi.fn();
vi.mock('react-router-dom', () => ({
    useNavigate: () => navigateSpy,
}));

const mutateAsync = vi.fn();
vi.mock('state/api/studysetsAPI', () => ({
    useCreateStudyset: () => ({ mutateAsync, isPending: false }),
}));

describe('useCreateStudysetAction', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useGlobalStore.setState({ loadingActions: [] });
    });

    it('navigates to the new set on success and clears the loading action', async () => {
        mutateAsync.mockResolvedValueOnce({ studyset: { studysetUUID: 'u1' } });
        const { result } = renderHook(() => useCreateStudysetAction());

        await act(async () => {
            await result.current.createAndOpen();
        });

        expect(navigateSpy).toHaveBeenCalledWith('/edit/u1');
        expect(useGlobalStore.getState().loadingActions).toHaveLength(0);
    });

    it('still clears the loading action when the mutation rejects', async () => {
        mutateAsync.mockRejectedValueOnce(new Error('nope'));
        const consoleSpy = vi
            .spyOn(console, 'error')
            .mockImplementation(() => {});
        const { result } = renderHook(() => useCreateStudysetAction());

        await act(async () => {
            await result.current.createAndOpen();
        });

        expect(navigateSpy).not.toHaveBeenCalled();
        expect(useGlobalStore.getState().loadingActions).toHaveLength(0);
        consoleSpy.mockRestore();
    });

    it('runs onStart before the mutation', async () => {
        mutateAsync.mockResolvedValueOnce({ studyset: { studysetUUID: 'u1' } });
        const onStart = vi.fn();
        const { result } = renderHook(() =>
            useCreateStudysetAction({ onStart })
        );

        await act(async () => {
            await result.current.createAndOpen();
        });

        expect(onStart.mock.invocationCallOrder[0]!).toBeLessThan(
            mutateAsync.mock.invocationCallOrder[0]!
        );
    });
});
