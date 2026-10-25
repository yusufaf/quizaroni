export type PublishError =
    | { code: 'invalidSubject' }
    | { code: 'notEnoughCards'; required: number; actual: number }
    | { code: 'hidden' };

export type PublishErrorCode = PublishError['code'];

/** Sent by update-studyset when a save took a published set off the public index. */
export type UnpublishedOnSave = { errors: PublishError[] };
