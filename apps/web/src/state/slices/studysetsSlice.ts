import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// TODO: Type this
type StudySetsSliceState = {
  studySets: any[];
  selectedStudySet: any;
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

// Action creators are generated for each case reducer function
export const { 
    setStudySets,
    setSelectedStudySet
} = studysetsSlice.actions

/* Selectors */
export const selectStudySets = (state) => state.studySets.studySets;
export const selectSelectedStudySet = (state) => state.studySets.selectedStudySet;

export default studysetsSlice.reducer