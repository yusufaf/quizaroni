// Cutover (#269): with readOnly on, every route except these goes to the
// readOnly lambda. An allowlist, so a route added later is blocked by default.
export const READ_ONLY_ALLOWED_LAMBDAS: ReadonlySet<string> = new Set([
    'getStudyset',
    'getAllStudysets',
    'getUser',
    'downloadUserData',
    'getPublicStudyset',
    'getPublicStudysets',
    'getExploreFeed',
]);

export const READ_ONLY_MESSAGE =
    'Quizaroni is moving to a new server, so saving is paused for a few minutes. Please try again shortly.';

export function parseReadOnly(value: string | undefined): boolean {
    if (value === undefined || value === '' || value === 'false') return false;
    if (value === 'true') return true;
    throw new Error(`readOnly must be true or false (got "${value}")`);
}
