import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  Studyset
} from "lib/types";

type AdvancedSectionProps = {
  expanded: boolean;
  blankCardsCount: number;
};

type CreateSetSliceState = {
    showImportModal: boolean;
    advancedSectionProps: AdvancedSectionProps;
}

const initialState: CreateSetSliceState = {
    showImportModal: false,
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
    setShowImportModal: (state, action: PayloadAction<boolean>) => {
        state.showImportModal = action.payload;
    },
    setAdvancedSectionProps: (state, action: PayloadAction<AdvancedSectionProps>) => {
      state.advancedSectionProps = action.payload;
  },
  },
})

export const { 
    setShowImportModal,
    setAdvancedSectionProps,
} = createSetSlice.actions

/* Selectors */
export const selectShowImportModal = (state): boolean => state[sliceName].showImportModal;
export const selectAdvancedSectionProps = (state): AdvancedSectionProps => state[sliceName].advancedSectionProps;

export default createSetSlice.reducer