export type ScopeId =
    | 'global'
    | 'nav'
    | 'study:flashcards'
    | 'study:mc'
    | 'study:typewrite'
    | 'study:matching';

export interface Shortcut {
    /** Unique id, e.g. 'flashcards.flip'. Used as registry key. */
    id: string;
    /** Key combos that trigger this. Single keys use KeyboardEvent.key
     *  values (' ', 'Enter', 'ArrowLeft', '1', 'c', '/', '?', 'Escape').
     *  Two-key sequences use a space, e.g. 'g h'. */
    keys: string[];
    scope: ScopeId;
    /** i18n key under shortcuts.actions.* for the help modal. */
    descriptionKey: string;
    handler: (e: KeyboardEvent) => void;
    /** Optional predicate; binding only fires/lists when it returns true. */
    when?: () => boolean;
}
