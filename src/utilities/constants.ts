import type { SortDirection, User } from "lib/types";
import type { InitialCard } from "lib/types";
import { v4 as uuidv4 } from "uuid";

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

/* ==== Create Page Constants ==== */
export const CREATE_SET = {
    TITLE: "Create a new study set",
    TITLE_PLACEHOLDER: "Enter a title for your study set",
    DESC_PLACEHOLDER: "Enter a description for your study set",
    LABEL_PLACEHOLDER: "Enter a label for your study set",
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

export const EMPTY_CARD: InitialCard = {
    term: "",
    definition: "",
    uuid: uuidv4(),
};

export const VIEW_SET = {
    BACKGROUND: "BACKGROUND",
    TEXT: "TEXT",
};

export const STUDY_MODES = {
    FLASHCARDS: "FLASHCARDS",
};


/* ==== Download ==== */
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

export const DEFAULT_CSV_HEADERS = "Term, Definition";
export const METADATA_CSV_HEADERS = "Title, Description, Label, Downloaded on";

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

// https://bobbyhadz.com/blog/react-check-if-email-is-valid
export const EMAIL_REGEX = /\S+@\S+\.\S+/;

export const STUDYSET_CONFIRM_DIALOGS = {
    DELETE: "DELETE",
    DUPLICATE: "DUPLICATE",
};

export const STUDYSET_CONFIRM_DIALOG_PROPS = new Map([
    [STUDYSET_CONFIRM_DIALOGS.DELETE, {
        title: `Delete the study set`,
        dialogMessage: `Are you sure you want to delete this set?`
    }],
    [STUDYSET_CONFIRM_DIALOGS.DUPLICATE, {
        title: `Duplicate the study set`,
        dialogMessage: `Are you sure you want to duplicate this set?`
    }],
])

export const SET_METADATA_FIELDS = {
    TEXT: "textColorVisible",
    BACKGROUND: "backgroundColorVisible",
    PUBLIC: "publiclyViewable",
    CONTENT_ONLY: "contentOnly",
};

export const DEFAULT_CATEGORIES = {
    ALL: "All",
    IMPORTANT: "Important",
};

export const SORT_DIRECTIONS: { [key: string]: SortDirection } = {
    ASC: "asc",
    DSC: "dsc",
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

export const DEFAULT_USER_DATA: User = {
    createdAt: new Date().getTime(),
    email: "",
    labels: [],
    metadata: {
        defaultTheme: "dark",
        homeView: "table",
        namedColors: [],
    },
    username: "",
    uuid: "",
};

export const HTML_TABLE_HEADERS = [
    "Title",
    "Description",
    "Date Created",
    "Last Viewed",
    "# of Cards",
    "Label",
    "Favorited"
]