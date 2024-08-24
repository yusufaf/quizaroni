export const TABS = {
    CREATE: "CREATE",
    MANAGE: "MANAGE",
    ASSIGN: "ASSIGN",
} as const;

export type LabelsDialogTab = typeof TABS[keyof typeof TABS];
export type ErrorInfo = { helperText: string } | null;


export const ACTIONS = {
    EDIT: "EDIT",
    DELETE: "DELETE",
} as const;

export type LabelsDialogAction = typeof ACTIONS[keyof typeof ACTIONS];