import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  Studyset
} from "lib/types";

type StudySetsSliceState = {
  studySets: Studyset[];
  selectedStudySet: Studyset | null;
}

const initialState: StudySetsSliceState = {
    studySets: [],
    selectedStudySet: null,
}

export const studysetsSlice = createSlice({
  name: "studySets",
  initialState,
  reducers: {
    setStudySets: (state, action: PayloadAction<any>) => {
      state.studySets = action.payload;
    },
    setSelectedStudySet: (state, action: PayloadAction<any>) => {
      state.selectedStudySet = action.payload;
    },
  },
})

export const { 
    setStudySets,
    setSelectedStudySet
} = studysetsSlice.actions

/* Selectors */
export const selectStudySets = (state) => state.studySets.studySets;
export const selectSelectedStudySet = (state) => state.studySets.selectedStudySet;

export default studysetsSlice.reducer