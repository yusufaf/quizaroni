// Better Auth's limits, measured in UTF-16 code units like the server.
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;

export const passwordLengthOk = (password: string): boolean =>
    password.length >= PASSWORD_MIN && password.length <= PASSWORD_MAX;
