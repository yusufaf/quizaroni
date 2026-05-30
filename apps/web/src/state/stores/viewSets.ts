import { create } from 'zustand';
import { type ViewSetDialog } from 'constants/index';

type ViewSetsState = {
    selectedDialog: ViewSetDialog | '';
    setSelectedDialog: (dialog: ViewSetDialog | '') => void;
};

export const useViewSetsStore = create<ViewSetsState>((set) => ({
    selectedDialog: '',
    setSelectedDialog: (dialog) => set({ selectedDialog: dialog }),
}));

// Selector functions (optional, for convenience)
export const selectSelectedDialog = (state: ViewSetsState) =>
    state.selectedDialog;
