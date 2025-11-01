import { create } from 'zustand';
import { ConfirmDialogProps, LabelsDialogProps, Studyset } from 'shared/types';
import {
    STUDYSET_CONFIRM_DIALOG_PROPS,
    STUDYSET_CONFIRM_DIALOGS,
    INITIAL_CONFIRM_DIALOG_PROPS,
} from 'shared/constants';

type GlobalState = {
    authenticated: boolean;
    dialogOpen: boolean;
    confirmDialogProps: ConfirmDialogProps;
    feedbackDialogOpen: boolean;
    namedColorsDialogProps: any;
    userAuthInfo: any;
    userData: any;
    labelsDialogProps: LabelsDialogProps;
    confirmationCodeDialogProps: any;
    loadingActions: string[];

    // Actions
    setUserAuthState: (info: any) => void;
    setDialogOpen: (open: boolean) => void;
    setAuthenticated: (authenticated: boolean) => void;
    setUserData: (data: any) => void;
    setConfirmDialogProps: (props: ConfirmDialogProps) => void;
    showConfirmDialog: (params: {
        type: string;
        studysets: Studyset[];
    }) => void;
    setNamedColorsDialogProps: (props: any) => void;
    setFeedbackDialogOpen: (feedbackDialogOpen: boolean) => void;
    setLabelsDialogProps: (props: LabelsDialogProps) => void;
    setConfirmationCodeDialogProps: (props: any) => void;
    setLoadingAdd: (actionId: string) => void;
    setLoadingRemove: (actionId: string) => void;
};

export const useGlobalStore = create<GlobalState>((set, get) => ({
    authenticated: false,
    dialogOpen: false,
    confirmDialogProps: { ...INITIAL_CONFIRM_DIALOG_PROPS },
    feedbackDialogOpen: false,
    namedColorsDialogProps: {},
    userAuthInfo: {},
    userData: {},
    labelsDialogProps: {
        open: false,
    },
    confirmationCodeDialogProps: {},
    loadingActions: [],

    setUserAuthState: (info) => set({ userAuthInfo: info }),
    setDialogOpen: (open) => set({ dialogOpen: open }),
    setAuthenticated: (authenticated) => set({ authenticated }),
    setUserData: (data) => set({ userData: data }),
    setConfirmDialogProps: (props) => set({ confirmDialogProps: props }),
    showConfirmDialog: ({ type, studysets }) => {
        const initialProps = STUDYSET_CONFIRM_DIALOG_PROPS.get(type)!;
        const { title, dialogMessage } = initialProps;

        let dialogProps: ConfirmDialogProps = {
            open: true,
            title: '',
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
                const messages: string[] = [];
                for (const studyset of studysets) {
                    messages.push(studyset.title);
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

        set({ confirmDialogProps: dialogProps });
    },
    setNamedColorsDialogProps: (props) =>
        set({ namedColorsDialogProps: props }),
    setFeedbackDialogOpen: (feedbackDialogOpen) => set({ feedbackDialogOpen }),
    setLabelsDialogProps: (props) => set({ labelsDialogProps: props }),
    setConfirmationCodeDialogProps: (props) =>
        set({ confirmationCodeDialogProps: props }),
    setLoadingAdd: (actionId) => {
        const loadingActions = get().loadingActions;
        if (!loadingActions.includes(actionId)) {
            set({ loadingActions: [...loadingActions, actionId] });
        }
    },
    setLoadingRemove: (actionId) => {
        set((state) => ({
            loadingActions: state.loadingActions.filter(
                (id) => id !== actionId
            ),
        }));
    },
}));
