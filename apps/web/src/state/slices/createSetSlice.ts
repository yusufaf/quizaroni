import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  Studyset
} from "lib/types";

type AdvancedSectionProps = {
  expanded: boolean;
  blankCardsCount: number;
};

type CreateSetSliceState = {
    advancedSectionProps: AdvancedSectionProps;
}

const initialState: CreateSetSliceState = {
    advancedSectionProps: {
      expanded: false,
      blankCardsCount: 0,
    },
}

const sliceName = "createSet";

export const createSetSlice = createSlice({
  name: sliceName,
  initialState,
  reducers: {
    setAdvancedSectionProps: (state, action: PayloadAction<AdvancedSectionProps>) => {
      state.advancedSectionProps = action.payload;
  },
  },
})

export const { 
    setAdvancedSectionProps,
} = createSetSlice.actions

/* Selectors */
export const selectAdvancedSectionProps = (state): AdvancedSectionProps => state[sliceName].advancedSectionProps;

export default createSetSlice.reducer