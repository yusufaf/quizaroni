import { SortDirection } from "lib/types";

export const LIGHT = "light";
export const DARK = "dark";

export const SUCCESS = "success";
export const SUCCESS_U = "Success";
export const ERROR = "error";
export const ERROR_U = "Error";

export const DISABLED = "Disabled";
export const ENABLED = "Enabled";

export const ROUTES = {
    LOGIN: "/login",
    SIGNUP: "/signup",
    CREATE: "/create",
};

export const PAGES = {
    CREATE: "Create",
    LOGIN: "login",
    SIGNUP: "signup",
    profile: "profile",
    home: "home",
};

export const DELETE_ACCOUNT_MSG = `We're sad to see you go, but if you're certain you want to delete your account, 
                                    please confirm your password below.`;
export const SIGNUP_SUCCESS_MSG = "Account successfully created!";
export const SIGNUP_ERROR_MSG = "Could not create an account";
export const LOGIN_SUCCESS_MSG = "Successfully logged in!";
export const LOGIN_ERROR_MSG = "Could not login, check email and password";
export const LOGOUT_SUCCESS_MSG = "Successfully logged out!";
export const LOGOUT_ERROR_MSG = "Error when logging out";

export const LOGIN_MESSAGES = {
    createSet:
        "Please login or create an account to start creating flash cards!",
    login: "You're already logged in!",
    signup: "Please log out of your account to create a new account!",
    profile: "Please login to view your profile!",
    home: "Please login to view your created flash cards!",
};

export const FLASHSET_COLUMNS = {
    TITLE: "Title",
    DESCRIPTION: "Description",
    CREATED: "Created on",
    LABEL: "Label",
};

export const CREATE_SET = {
    TITLE: "Create a new study set",
    TITLE_PLACEHOLDER: "Enter a title for your new study set",
    DESC_PLACEHOLDER: "Enter a description for your new study set",
    LABEL_PLACEHOLDER: "Enter a label for your new study set",
};

export const VIEW_SET = {
    BACKGROUND: "BACKGROUND",
    TEXT: "TEXT",
};

export const STUDY_MODES = {
    FLASHCARDS: "FLASHCARDS",
};

export const DOWNLOAD_FILE_TYPES = {
    TXT: "TXT",
    JSON: "JSON",
    CSV: "CSV",
    MD: "MD",
};

export const DOWNLOAD_FILE_TITLES = {
    [DOWNLOAD_FILE_TYPES.TXT]: "Text File",
    [DOWNLOAD_FILE_TYPES.JSON]: "JavaScript Object Notation",
    [DOWNLOAD_FILE_TYPES.CSV]: "Comma Separated Values",
    [DOWNLOAD_FILE_TYPES.MD]: "Markdown File",
}

export const MIME_TYPES: { [key: string]: string } = {
    [DOWNLOAD_FILE_TYPES.TXT]: "text/plain",
    [DOWNLOAD_FILE_TYPES.JSON]: "application/json",
    [DOWNLOAD_FILE_TYPES.CSV]: "text/csv",
    [DOWNLOAD_FILE_TYPES.MD]: "text/markdown",
}


export const HOME_LAYOUTS = {
    TABLE: "table",
    GRID: "grid",
    HTML: "html",
};

// Define regex patterns for each requirement
export const PWD_REGEX = {
    uppercase: /(?=.*[A-Z])/,
    special: /(?=.*[!@#$%^&*])/,
    lowercase: /(?=.*[a-z])/,
    number: /(?=.*[0-9])/,
    length: /^.{8,}$/,
};

export const CONFIRM_DIALOGS = {
    DELETE: "DELETE",
    DUPLICATE: "DUPLICATE",
};

export const SET_METADATA_FIELDS = {
    TEXT: "textColorVisible",
    BACKGROUND: "backgroundColorVisible",
    PUBLIC: "publiclyViewable",
};

export const DEFAULT_CATEGORIES = {
    ALL: "All",
    IMPORTANT: "Important",
};

export const SORT_DIRECTIONS: { [key: string]: SortDirection } = {
    ASC: "asc",
    DSC: "dsc",
};

export const CREATE_PAGE_TYPES: { [key: string]: string } = {
    CREATE: "Create",
    EDIT: "Edit",
};

export const CREATE_PAGE_PROPS: { [key: string]: any } = {
    [CREATE_PAGE_TYPES.CREATE]: {
        TITLE: "Create a new study set",
        BUTTON: "Create Set",
    },
    [CREATE_PAGE_TYPES.EDIT]: {
        TITLE: "Edit your study set",
        BUTTON: "Save Changes",
    },
};

export const DEFAULT_TERMINOLOGY = "Term/Definition";

export const FORMAT_TERMINOLOGIES = {
    TERM_DEFINITION: "Term/Definition",
    QUESTION_ANSWER: "Question/Answer",
    PROMPT_RESPONSE: "Prompt/Response",
    WORD_MEANING: "Word/Meaning",
    FACT_EXPLANATION: "Fact/Explanation",
    CUSTOM: "Custom",
}

export const LABEL_TERMINOLOGIES = {
    CARD: "Card",
    ITEM: "Item",
    FLASHCARD: "Flashcard",
    ENTRY: "Entry",
    CONCEPT: "Concept",
    IDEA: "Idea",
    NOTE: "Note",
    CUSTOM: "Custom",
}

export const VIEW_SET_DIALOGS: { [key: string]: string } = {
    LABELS: "LABELS",
    NOTIFICATIONS: "NOTIFICATIONS",
    DOWNLOAD: "DOWNLOAD",
    CATEGORIES: "CATEGORIES",
    SETTINGS: "SETTINGS",
    PRINT: "PRINT",
    SHARE: "SHARE",
}

export const NOTES_DRAWER_POSITIONS = {
    LEFT: "left",
    RIGHT: "right",
}

export const EMPTY_NOTE_PLACEHOLDER = "Enter text for the note";

export const NOTES_DRAWER_INITIAL_APPEARANCE = {
    OPEN: "open",
    CLOSED: "closed",
}