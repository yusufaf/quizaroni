import { create } from 'zustand';
import { Studyset } from 'shared/types';

type AdvancedSectionProps = {
    expanded: boolean;
    blankCardsCount: number;
};

type CreateSetState = {
    advancedSectionProps: AdvancedSectionProps;
    setAdvancedSectionProps: (props: AdvancedSectionProps) => void;
};

export const useCreateSetStore = create<CreateSetState>((set) => ({
    advancedSectionProps: {
        expanded: false,
        blankCardsCount: 0,
    },
    setAdvancedSectionProps: (props) => set({ advancedSectionProps: props }),
}));

// Selector functions (optional, for convenience)
export const selectAdvancedSectionProps = (state: CreateSetState) => state.advancedSectionProps;