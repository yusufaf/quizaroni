import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import {
    RootState
} from "state/store"

type GlobalSliceState = {
    alert: any;
    userAuthInfo: any;
    feedbackDialogOpen: boolean;
    dialogOpen: boolean;
    cognitoUser: any;
    authenticated: boolean;
    userData: any;
    dialogProps: any;
};

const initialState: GlobalSliceState = {
    alert: {},
    userAuthInfo: {},
    feedbackDialogOpen: false,
    dialogOpen: false,
    cognitoUser: {},
    authenticated: false,
    userData: {},
    dialogProps: {},
};

export const globalSlice = createSlice({
    name: "global",
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
        setDialogOpen: (state, action: PayloadAction<boolean>) => {
            state.dialogOpen = action.payload;
        },
        setAuthenticated: (state, action: PayloadAction<boolean>) => {
            state.authenticated = action.payload;
        },
        setUserData: (state, action: PayloadAction<any>) => {
            state.userData = action.payload;
        },
        setDialogProps: (state, action: PayloadAction<any>) => {
            state.dialogProps = action.payload;
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
});

// Action creators are generated for each case reducer function
export const {
    setUserAuthState,
    setAlert,
    setDialogOpen,
    setCognitoUser,
    setAuthenticated,
    setUserData,
    setDialogProps,
} = globalSlice.actions;

/* Selectors */
export const selectAlert = (state: RootState) => state.global.alert;
export const selectDialogOpen = (state: RootState) => state.global.dialogOpen;
export const selectUserAuthState = (state: RootState) => state.global.userAuthInfo;
export const selectCognitoUser = (state: RootState) => state.global.cognitoUser;
export const selectAuthenticated = (state: RootState) => state.global.authenticated;
export const selectUserData = (state: RootState) => state.global.userData;
export const selectDialogProps = (state: RootState) => state.global.dialogProps;

export default globalSlice.reducer;
