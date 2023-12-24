import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { RootState } from "state/store";

type GlobalSliceState = {
    authenticated: boolean;
    cognitoUser: any;
    dialogOpen: boolean;
    dialogProps: any;
    feedbackDialogOpen: boolean;
    namedColorsDialogProps: any;
    userAuthInfo: any;
    userData: any;
    labelsDialogProps: any;
    confirmationCodeDialogProps: any;
};

const initialState: GlobalSliceState = {
    authenticated: false,
    cognitoUser: {},
    dialogOpen: false,
    dialogProps: {},
    feedbackDialogOpen: false,
    namedColorsDialogProps: {},
    userAuthInfo: {},
    userData: {},
    labelsDialogProps: {},
    confirmationCodeDialogProps: {},
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
        setNamedColorsDialogProps: (state, action: PayloadAction<any>) => {
            state.namedColorsDialogProps = action.payload;
        },
        setFeedbackDialogOpen: (state, action: PayloadAction<boolean>) => {
            state.dialogOpen = action.payload;
        },
        setLabelsDialogProps: (state, action: PayloadAction<any>) => {
            state.labelsDialogProps = action.payload;
        },
        setConfirmationCodeDialogProps: (state, action: PayloadAction<any>) => {
            state.confirmationCodeDialogProps = action.payload;
        },
    },
});

export const {
    setAuthenticated,
    setCognitoUser,
    setDialogOpen,
    setDialogProps,
    setFeedbackDialogOpen,
    setNamedColorsDialogProps,
    setUserAuthState,
    setUserData,
    setLabelsDialogProps,
    setConfirmationCodeDialogProps
} = globalSlice.actions;

/* Selectors */
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
export const selectNamedColorsDialogProps = (state: RootState) =>
    state[sliceName].namedColorsDialogProps;
export const selectFeedbackDialogOpen = (state: RootState) =>
    state[sliceName].dialogOpen;
export const selectLabelsDialogProps = (state: RootState) =>
    state[sliceName].labelsDialogProps;
export const selectConfirmationCodeDialogProps = (state: RootState) =>
    state[sliceName].confirmationCodeDialogProps;


export default globalSlice.reducer;
