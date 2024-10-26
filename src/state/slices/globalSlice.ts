import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ConfirmDialogProps, LabelsDialogProps, Studyset } from "lib/types";
import { RootState } from "state/store";
import {
    STUDYSET_CONFIRM_DIALOG_PROPS,
    STUDYSET_CONFIRM_DIALOGS,
    INITIAL_CONFIRM_DIALOG_PROPS
} from "utilities/constants";

type CognitoUser = {
    username: string;
};

type GlobalSliceState = {
    authenticated: boolean;
    // cognitoUser: CognitoUser;
    dialogOpen: boolean;
    confirmDialogProps: ConfirmDialogProps;
    feedbackDialogOpen: boolean;
    namedColorsDialogProps: any;
    userAuthInfo: any;
    userData: any;
    labelsDialogProps: LabelsDialogProps;
    confirmationCodeDialogProps: any;
};

const initialState: GlobalSliceState = {
    authenticated: false,
    // cognitoUser: {
    //     username: "",
    // },
    dialogOpen: false,
    confirmDialogProps: {...INITIAL_CONFIRM_DIALOG_PROPS},
    feedbackDialogOpen: false,
    namedColorsDialogProps: {},
    userAuthInfo: {},
    userData: {},
    labelsDialogProps: {
        open: false,
    },
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
        // setCognitoUser: (state, action: PayloadAction<CognitoUser>) => {
        //     state.cognitoUser = action.payload;
        // },
        setDialogOpen: (state, action: PayloadAction<boolean>) => {
            state.dialogOpen = action.payload;
        },
        setAuthenticated: (state, action: PayloadAction<boolean>) => {
            state.authenticated = action.payload;
        },
        setUserData: (state, action: PayloadAction<any>) => {
            state.userData = action.payload;
        },
        setConfirmDialogProps: (state, action: PayloadAction<ConfirmDialogProps>) => {
            state.confirmDialogProps = action.payload;
        },
        // TODO: Could possibly rename to showStudysetConfirmDialog
        showConfirmDialog: (
            state,
            action: PayloadAction<{ type: string; studysets: Studyset[] }>
        ) => {
            console.log("Entered showConfirmDialog with = ", {
                state,
                action
            })
            const { type, studysets } = action.payload;
            const initialProps = STUDYSET_CONFIRM_DIALOG_PROPS.get(type)!;
            const { title, dialogMessage } = initialProps;

            let dialogProps: ConfirmDialogProps = {
                open: true,
                title: "",
                type,
            };

            switch (type) {
                case STUDYSET_CONFIRM_DIALOGS.DELETE:
                case STUDYSET_CONFIRM_DIALOGS.DUPLICATE: {
                    const studyset = studysets[0];
                    dialogProps = {
                        ...dialogProps,
                        dialogMessage,
                        title: `${title} ${studyset.title}?`,
                        props: {
                            studysetUUID: studyset.studysetUUID,
                        },
                    };
                    break;
                }
                case STUDYSET_CONFIRM_DIALOGS.DELETE_MULTIPLE:
                case STUDYSET_CONFIRM_DIALOGS.DUPLICATE_MULTIPLE: {
                    const studysetUUIDs: string[] = [];
                    const messages: string[] = []
                    for (const studyset of studysets) {
                        messages.push(studyset.title)
                        studysetUUIDs.push(studyset.studysetUUID);
                    }

                    dialogProps = {
                        ...dialogProps,
                        dialogMessage,
                        title,
                        props: {
                            studysetUUIDs,
                            messages,
                        },
                    };
                    break;
                }
            }

            // Update the confirmDialogProps state
            state.confirmDialogProps = dialogProps;
        },
        setNamedColorsDialogProps: (state, action: PayloadAction<any>) => {
            state.namedColorsDialogProps = action.payload;
        },
        setFeedbackDialogOpen: (state, action: PayloadAction<boolean>) => {
            state.dialogOpen = action.payload;
        },
        setLabelsDialogProps: (state, action: PayloadAction<LabelsDialogProps>) => {
            state.labelsDialogProps = action.payload;
        },
        setConfirmationCodeDialogProps: (state, action: PayloadAction<any>) => {
            state.confirmationCodeDialogProps = action.payload;
        },
    },
});

export const {
    setAuthenticated,
    // setCognitoUser,
    setDialogOpen,
    setConfirmDialogProps,
    setFeedbackDialogOpen,
    setNamedColorsDialogProps,
    setUserAuthState,
    setUserData,
    setLabelsDialogProps,
    setConfirmationCodeDialogProps,
    showConfirmDialog,
} = globalSlice.actions;

/* Selectors */
export const selectDialogOpen = (state: RootState) =>
    state[sliceName].dialogOpen;
export const selectUserAuthState = (state: RootState) =>
    state[sliceName].userAuthInfo;
// export const selectCognitoUser = (state: RootState) =>
//     state[sliceName].cognitoUser;
export const selectAuthenticated = (state: RootState) =>
    state[sliceName].authenticated;
export const selectUserData = (state: RootState) => state[sliceName].userData;
export const selectConfirmDialogProps = (state: RootState) =>
    state[sliceName].confirmDialogProps;
export const selectNamedColorsDialogProps = (state: RootState) =>
    state[sliceName].namedColorsDialogProps;
export const selectFeedbackDialogOpen = (state: RootState) =>
    state[sliceName].dialogOpen;
export const selectLabelsDialogProps = (state: RootState) =>
    state[sliceName].labelsDialogProps;
export const selectConfirmationCodeDialogProps = (state: RootState) =>
    state[sliceName].confirmationCodeDialogProps;

export default globalSlice.reducer;
