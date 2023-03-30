import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type GlobalSliceState = {
  alert: any,
  userAuthInfo: any,
  feedbackDialogOpen: boolean,
  dialogOpen: boolean,
}

const initialState: GlobalSliceState = {
    alert: {},
    userAuthInfo: {},
    feedbackDialogOpen: false,
    dialogOpen: false,
}

export const globalSlice = createSlice({
  name: 'global',
  initialState,
  reducers: {
    setUserAuthState: (state, action: PayloadAction<any>) => {
      state.userAuthInfo = action.payload;
    },
    setAlert: (state, action: PayloadAction<any>) => {
      state.alert = action.payload;
    },
    setFeedbackDialogOpen: (state, action: PayloadAction<boolean>) => {
      state.feedbackDialogOpen = action.payload;
    },
    setDialogOpen: (state, action: PayloadAction<boolean>) => {
      state.dialogOpen = action.payload;
    },

    /* Customizing a generated action creator 
     addTodo: {
      reducer: (state, action) => {
        state.push(action.payload)
      },
      prepare: (text) => {
        const id = nanoid()
        return { payload: { id, text } }
      },
    },
    */
  },
})

// Action creators are generated for each case reducer function
export const { 
  setUserAuthState,
  setAlert,
  setFeedbackDialogOpen,
  setDialogOpen,
} = globalSlice.actions

/* Selectors */
export const selectAlert = (state) => state.global.alert;
export const selectFeedbackDialogOpen = (state) => state.global.feedbackDialogOpen;
export const selectUserAuthState = (state) => state.global.userAuthInfo;

export default globalSlice.reducer