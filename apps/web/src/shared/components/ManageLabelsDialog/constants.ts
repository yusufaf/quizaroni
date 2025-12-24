export const TABS = {
    MANAGE: "MANAGE",
    ASSIGN: "ASSIGN",
} as const;

export type LabelsDialogTab = typeof TABS[keyof typeof TABS];
export type ErrorInfo = { helperText: string } | null;