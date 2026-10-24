export type UpdatedByFragment = { clauses: string[]; values: Record<string, string> };

/** The `updatedBy` SET clause and value, or neither when the token has no username claim (#180). */
export const buildUpdatedBy = (username?: string): UpdatedByFragment =>
    username
        ? { clauses: ['updatedBy = :updatedBy'], values: { ':updatedBy': username } }
        : { clauses: [], values: {} };
