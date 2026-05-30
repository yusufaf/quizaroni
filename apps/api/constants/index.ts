// Extra allowed CORS origins (e.g. your deployed frontend) come from the
// ALLOWED_ORIGINS env var as a comma-separated list. localhost is always
// allowed for local development. See apps/api/.env.example.
const extraOrigins = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

export const DEFAULT_ALLOWED_ORIGINS = [
    'http://localhost:3000',
    ...extraOrigins,
];
