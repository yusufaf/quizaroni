import { create } from 'zustand';
import { Studyset } from 'shared/types';

type StudySetsState = {
    studySets: Studyset[];
    selectedStudySet: Studyset | null;
    setStudySets: (studySets: Studyset[]) => void;
    setSelectedStudySet: (studySet: Studyset | null) => void;
};

export const useStudySetsStore = create<StudySetsState>((set) => ({
    studySets: [],
    selectedStudySet: null,
    setStudySets: (studySets) => set({ studySets }),
    setSelectedStudySet: (selectedStudySet) => set({ selectedStudySet }),
}));

// Selector functions (optional, for convenience)
export const selectStudySets = (state: StudySetsState) => state.studySets;
export const selectSelectedStudySet = (state: StudySetsState) => state.selectedStudySet;