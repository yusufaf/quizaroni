import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Studyset } from 'shared/types';

type ViewSetsSliceState = {
    selectedDialog: string;
};

const initialState: ViewSetsSliceState = {
    selectedDialog: '',
};

const sliceName = 'viewSets';

export const viewSetsSlice = createSlice({
    name: sliceName,
    initialState,
    reducers: {
        setSelectedDialog: (state, action: PayloadAction<any>) => {
            state.selectedDialog = action.payload;
        },
    },
});

export const { setSelectedDialog } = viewSetsSlice.actions;

/* Selectors */
export const selectSelectedDialog = (state) => state[sliceName].selectedDialog;

export default viewSetsSlice.reducer;
