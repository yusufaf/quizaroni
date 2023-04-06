import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type GlobalSliceState = {
  alert: any,
  userAuthInfo: any,
  feedbackDialogOpen: boolean,
  dialogOpen: boolean,
  cognitoUser: any,
  authenticated: boolean,
}

const initialState: GlobalSliceState = {
    alert: {},
    userAuthInfo: {},
    feedbackDialogOpen: false,
    dialogOpen: false,
    cognitoUser: {},
    authenticated: false,
}

export const globalSlice = createSlice({
  name: 'global',
  initialState,
  reducers: {
    setUserAuthState: (state, action: PayloadAction<any>) => {
      state.userAuthInfo = action.payload;
    },
    setCognitoUser: (state, action: PayloadAction<any>) => {
      state.cognitoUser = action.payload;
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
    setAuthenticated: (state, action: PayloadAction<boolean>) => {
      state.authenticated = action.payload;
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
  setCognitoUser,
  setAuthenticated
} = globalSlice.actions

/* Selectors */
export const selectAlert = (state) => state.global.alert;
export const selectFeedbackDialogOpen = (state) => state.global.feedbackDialogOpen;
export const selectUserAuthState = (state) => state.global.userAuthInfo;
export const selectCognitoUser = (state) => state.global.cognitoUser;
export const selectAuthenticated = (state) => state.global.authenticated;

export default globalSlice.reducer