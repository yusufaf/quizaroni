import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const initialState = {
    alert: {},
    userAuthInfo: {},
    feedbackDialogOpen: false,
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
    setFeedbackDialogOpen: (state, action: PayloadAction<any>) => {
      state.feedbackDialogOpen = action.payload;
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
  setFeedbackDialogOpen
} = globalSlice.actions

export const selectAlert = (state) => state.global.alert;
export const selectFeedbackDialogOpen = (state) => state.global.feedbackDialogOpen;
export const selectUserAuthState = (state) => state.global.userAuthInfo;

export default globalSlice.reducer