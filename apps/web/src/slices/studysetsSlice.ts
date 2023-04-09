import { createSlice, PayloadAction } from '@reduxjs/toolkit';

// TODO: Type this
type StudySetsSliceState = {
  studySets: any[],

}

const initialState: StudySetsSliceState = {
    studySets: [],
}

export const studysetsSlice = createSlice({
  name: "studySets",
  initialState,
  reducers: {
    setStudySets: (state, action: PayloadAction<any>) => {
      state.studySets = action.payload;
    },
  },
})

// Action creators are generated for each case reducer function
export const { 
    setStudySets,
} = studysetsSlice.actions

/* Selectors */
export const selectStudySets = (state) => state.studySets.studySets;

export default studysetsSlice.reducer