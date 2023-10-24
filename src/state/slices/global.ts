import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "state/store";

type GlobalSliceState = {
    alert: any;
    userAuthInfo: any;
    feedbackDialogOpen: boolean;
    dialogOpen: boolean;
    cognitoUser: any;
    authenticated: boolean;
    userData: any;
    dialogProps: any;
    namedColorDialogProps: any;
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
    namedColorDialogProps: false,
};

const sliceName = "globalState";

export const globalSlice = createSlice({
    name: sliceName,
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
        setNamedColorDialogProps: (state, action: PayloadAction<any>) => {
            state.namedColorDialogProps = action.payload;
        },
    },
});

export const {
    setUserAuthState,
    setAlert,
    setDialogOpen,
    setCognitoUser,
    setAuthenticated,
    setUserData,
    setDialogProps,
    setNamedColorDialogProps,
} = globalSlice.actions;

/* Selectors */
export const selectAlert = (state: RootState) => state[sliceName].alert;
export const selectDialogOpen = (state: RootState) =>
    state[sliceName].dialogOpen;
export const selectUserAuthState = (state: RootState) =>
    state[sliceName].userAuthInfo;
export const selectCognitoUser = (state: RootState) =>
    state[sliceName].cognitoUser;
export const selectAuthenticated = (state: RootState) =>
    state[sliceName].authenticated;
export const selectUserData = (state: RootState) => state[sliceName].userData;
export const selectDialogProps = (state: RootState) =>
    state[sliceName].dialogProps;
export const selectNamedColorDialogProps = (state: RootState) =>
    state[sliceName].namedColorDialogProps;

export default globalSlice.reducer;
