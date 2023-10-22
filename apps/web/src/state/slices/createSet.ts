import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  Studyset
} from "lib/types";

type CreateSetSliceState = {
    showImportModal: boolean;
}

const initialState: CreateSetSliceState = {
    showImportModal: false,
}

const sliceName = "createSet";

export const createSetSlice = createSlice({
  name: sliceName,
  initialState,
  reducers: {
    setShowImportModal: (state, action: PayloadAction<boolean>) => {
        state.showImportModal = action.payload;
    }
  },
})

export const { 
    setShowImportModal
} = createSetSlice.actions

/* Selectors */
export const selectShowImportModal = (state) => state[sliceName].showImportModal;

export default createSetSlice.reducer