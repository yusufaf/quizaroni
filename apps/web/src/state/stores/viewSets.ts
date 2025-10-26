import { create } from 'zustand';

type ViewSetsState = {
    selectedDialog: string;
    setSelectedDialog: (dialog: string) => void;
};

export const useViewSetsStore = create<ViewSetsState>((set) => ({
    selectedDialog: '',
    setSelectedDialog: (dialog) => set({ selectedDialog: dialog }),
}));

// Selector functions (optional, for convenience)
export const selectSelectedDialog = (state: ViewSetsState) => state.selectedDialog;