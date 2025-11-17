import type {
    Card,
    ConfirmDialogProps,
    SortDirection,
    User,
} from 'shared/types';

export const LIGHT = 'light';
export const DARK = 'dark';

export const SUCCESS = 'success';
export const SUCCESS_U = 'Success';
export const ERROR = 'error';
export const ERROR_U = 'Error';

export const DISABLED = 'Disabled';
export const ENABLED = 'Enabled';

export const ROUTES = {
    LOGIN: '/login',
    SIGNUP: '/signup',
    CREATE: '/create',
};

export const PAGE_TITLES = {
    CREATE: 'Create',
    EDIT: 'Edit',
    HOME: 'Home',
    LOGIN: 'Login',
    SIGN_UP: 'Sign Up',
    EXPLORE: 'Explore',
    PROFILE: 'Profile',
};

export const DELETE_ACCOUNT_MSG = `We're sad to see you go, but if you're certain you want to delete your account, 
                                    please confirm your password below.`;
export const SIGNUP_SUCCESS_MSG = 'Account successfully created!';
export const SIGNUP_ERROR_MSG = 'Could not create an account';
export const LOGIN_SUCCESS_MSG = 'Successfully logged in!';
export const LOGIN_ERROR_MSG = 'Could not login, check email and password';
export const LOGOUT_SUCCESS_MSG = 'Successfully logged out!';
export const LOGOUT_ERROR_MSG = 'Error when logging out';

export const LOGIN_MESSAGES = {
    createSet:
        'Please login or create an account to start creating flash cards!',
    login: "You're already logged in!",
    signup: 'Please log out of your account to create a new account!',
    profile: 'Please login to view your profile!',
    home: 'Please login to view your created flash cards!',
};

export const FLASHSET_COLUMNS = {
    TITLE: 'Title',
    DESCRIPTION: 'Description',
    CREATED: 'Created on',
    LABEL: 'Label',
};

export const EMPTY_CARD: Card = {
    categories: [],
    definition: '',
    files: [],
    important: false,
    notes: [],
    term: '',
    cardUUID: crypto.randomUUID(),
};

export const VIEW_SET = {
    BACKGROUND: 'BACKGROUND',
    TEXT: 'TEXT',
};

export const STUDY_MODES = {
    FLASHCARDS: 'FLASHCARDS',
};

/* ==== Download ==== */
export const DOWNLOAD_FILE_TYPES = {
    TXT: 'TXT',
    JSON: 'JSON',
    CSV: 'CSV',
    MD: 'MD',
} as const;

export const DOWNLOAD_FILE_TITLES = {
    [DOWNLOAD_FILE_TYPES.TXT]: 'Text File',
    [DOWNLOAD_FILE_TYPES.JSON]: 'JavaScript Object Notation',
    [DOWNLOAD_FILE_TYPES.CSV]: 'Comma Separated Values',
    [DOWNLOAD_FILE_TYPES.MD]: 'Markdown File',
};

export const MIME_TYPES: { [key: string]: string } = {
    [DOWNLOAD_FILE_TYPES.TXT]: 'text/plain',
    [DOWNLOAD_FILE_TYPES.JSON]: 'application/json',
    [DOWNLOAD_FILE_TYPES.CSV]: 'text/csv',
    [DOWNLOAD_FILE_TYPES.MD]: 'text/markdown',
};

export const DEFAULT_CSV_HEADERS = 'Term, Definition';
export const METADATA_CSV_HEADERS = 'Title, Description, Label, Downloaded on';

export const HOME_LAYOUTS = {
    TABLE: 'table',
    GRID: 'grid',
    HTML: 'html',
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

export const INITIAL_CONFIRM_DIALOG_PROPS: ConfirmDialogProps = {
    open: false,
    title: '',
    type: '',
    dialogMessage: '',
};

export const STUDYSET_CONFIRM_DIALOGS = {
    DELETE: 'DELETE',
    DUPLICATE: 'DUPLICATE',
    DELETE_MULTIPLE: 'DELETE_MULTIPLE',
    DUPLICATE_MULTIPLE: 'DUPLICATE_MULTIPLE',
};

export const STUDYSET_CONFIRM_DIALOG_PROPS = new Map([
    [
        STUDYSET_CONFIRM_DIALOGS.DELETE,
        {
            title: `Delete the study set`,
            dialogMessage: `Are you sure you want to delete this set?`,
        },
    ],
    [
        STUDYSET_CONFIRM_DIALOGS.DUPLICATE,
        {
            title: `Duplicate the study set`,
            dialogMessage: `Are you sure you want to duplicate this set?`,
        },
    ],
    [
        STUDYSET_CONFIRM_DIALOGS.DELETE_MULTIPLE,
        {
            title: `Delete multiple study sets?`,
            dialogMessage: `The following sets will be deleted:`,
        },
    ],
    [
        STUDYSET_CONFIRM_DIALOGS.DUPLICATE_MULTIPLE,
        {
            title: `Duplicate multiple study sets?`,
            dialogMessage: `The following sets will be duplicated:`,
        },
    ],
]);

export const SET_METADATA_FIELDS = {
    TEXT: 'textColorVisible',
    BACKGROUND: 'backgroundColorVisible',
    PUBLIC: 'publiclyViewable',
    CONTENT_ONLY: 'contentOnly',
};

export const DEFAULT_CATEGORIES = {
    ALL: 'All',
    IMPORTANT: 'Important',
};

export const SORT_DIRECTIONS = {
    ASC: 'asc',
    DSC: 'dsc',
} as const;

export const DEFAULT_TERMINOLOGY = 'Term/Definition';

export const FORMAT_TERMINOLOGIES = {
    TERM_DEFINITION: 'Term/Definition',
    QUESTION_ANSWER: 'Question/Answer',
    PROMPT_RESPONSE: 'Prompt/Response',
    WORD_MEANING: 'Word/Meaning',
    FACT_EXPLANATION: 'Fact/Explanation',
    CUSTOM: 'Custom',
};

export const LABEL_TERMINOLOGIES = {
    CARD: 'Card',
    ITEM: 'Item',
    FLASHCARD: 'Flashcard',
    ENTRY: 'Entry',
    CONCEPT: 'Concept',
    IDEA: 'Idea',
    NOTE: 'Note',
    CUSTOM: 'Custom',
};

export const VIEW_SET_DIALOGS: { [key: string]: string } = {
    NOTIFICATIONS: 'NOTIFICATIONS',
    DOWNLOAD: 'DOWNLOAD',
    CATEGORIES: 'CATEGORIES',
    SETTINGS: 'SETTINGS',
    PRINT: 'PRINT',
    SHARE: 'SHARE',
};

export const NOTES_DRAWER_POSITIONS = {
    LEFT: 'left',
    RIGHT: 'right',
};

export const NOTES_DRAWER_POSITIONS_OPTIONS = [
    {
        value: NOTES_DRAWER_POSITIONS.LEFT,
        ariaLabel: 'left anchored',
        label: 'Left',
    },
    {
        value: NOTES_DRAWER_POSITIONS.RIGHT,
        ariaLabel: 'right anchored',
        label: 'Right',
    },
];

export const EMPTY_NOTE_PLACEHOLDER = 'Enter text for the note';

export const NOTES_DRAWER_INITIAL_APPEARANCE = {
    OPEN: 'open',
    CLOSED: 'closed',
};

export const NOTES_DRAWER_INITIAL_APPEARANCE_OPTIONS = [
    {
        value: NOTES_DRAWER_INITIAL_APPEARANCE.OPEN,
        ariaLabel: 'initially open',
        label: 'Open',
    },
    {
        value: NOTES_DRAWER_INITIAL_APPEARANCE.CLOSED,
        ariaLabel: 'initially closed',
        label: 'Closed',
    },
];

export const CARD_COUNT_VISIBILITY = {
    HIDDEN: false,
    VISIBLE: true,
};

export const CARD_COUNT_VISIBILITY_OPTIONS = [
    {
        value: CARD_COUNT_VISIBILITY.HIDDEN,
        ariaLabel: 'hidden',
        label: 'Hidden',
    },
    {
        value: CARD_COUNT_VISIBILITY.VISIBLE,
        ariaLabel: 'visible',
        label: 'Visible',
    },
];

export const DATE_FORMATS = {
    ISO_8601: 'YYYY-MM-DD',
    DMY: 'DD/MM/YYYY',
    MDY: 'MM/DD/YYYY',
} as const;

export const DEFAULT_USER_DATA: User = {
    createdAt: new Date().toISOString(),
    email: '',
    labels: [],
    metadata: {
        defaultTheme: 'dark',
        homeView: 'table',
        namedColors: [],
        preferredDateFormat: DATE_FORMATS.MDY,
        defaultDownloadFormat: DOWNLOAD_FILE_TYPES.JSON,
    },
    username: '',
    userUUID: '',
};

export const DEFAULT_USER_RESPONSE: { user: User } = {
    user: DEFAULT_USER_DATA,
};

export const HTML_TABLE_HEADERS = [
    'Title',
    'Description',
    'Created',
    'Last Viewed',
    '# of Cards',
    'Label',
    'Favorited',
];

export const LOADING_ACTIONS = {
    CREATE_STUDYSET: 'CREATE_STUDYSET',
} as const;

export type LoadingAction =
    (typeof LOADING_ACTIONS)[keyof typeof LOADING_ACTIONS];
