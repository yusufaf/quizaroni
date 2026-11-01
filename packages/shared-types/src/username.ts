export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 32;

// Logto's usernameRegEx (/^[A-Z_a-z]\w*$/) spelled out: \w without the u flag
// is [A-Za-z0-9_]. The length range is tighter than the tenant's 1-128 so
// author names stay short on cards.
export const USERNAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;

export const isValidUsername = (value: unknown): value is string =>
    typeof value === 'string' &&
    value.length >= USERNAME_MIN_LENGTH &&
    value.length <= USERNAME_MAX_LENGTH &&
    USERNAME_PATTERN.test(value);
