import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LOADING_ACTIONS } from 'shared/constants';
import { useCreateStudyset } from 'state/api/studysetsAPI';
import { useGlobalStore } from 'state/stores/global';

type Options = {
    /** Runs before the mutation starts, e.g. closing a drawer. */
    onStart?: () => void;
};

/**
 * Creates an empty studyset and opens its editor. Shared by the desktop nav
 * button, the mobile drawer and the mobile bottom bar so the loading-indicator
 * bookkeeping lives in exactly one place.
 */
export const useCreateStudysetAction = ({ onStart }: Options = {}) => {
    const navigate = useNavigate();
    const setLoadingAdd = useGlobalStore((state) => state.setLoadingAdd);
    const setLoadingRemove = useGlobalStore((state) => state.setLoadingRemove);
    const { mutateAsync: createStudyset, isPending } = useCreateStudyset();

    const createAndOpen = useCallback(async () => {
        onStart?.();
        setLoadingAdd(LOADING_ACTIONS.CREATE_STUDYSET);
        try {
            const { studyset } = await createStudyset();
            void navigate(`/edit/${studyset.studysetUUID}`);
        } catch (error) {
            console.error('Error creating studyset:', error);
        } finally {
            setLoadingRemove(LOADING_ACTIONS.CREATE_STUDYSET);
        }
    }, [createStudyset, navigate, onStart, setLoadingAdd, setLoadingRemove]);

    return { createAndOpen, isPending };
};
