// Cognito User Pool IDs are sourced from environment variables so the repo
// ships no account-specific identifiers. Supply these in apps/api/.env
// (see .env.example). Values are public client config, not secrets, but are
// kept out of source so each deployer uses their own pool.
const {
    DEV_USER_POOL_ID = '',
    PROD_USER_POOL_ID = '',
    DEV_USER_POOL_CLIENT_ID = '',
    PROD_USER_POOL_CLIENT_ID = '',
} = process.env;

export const USER_POOL_IDS: { [key: string]: string } = {
    development: DEV_USER_POOL_ID,
    production: PROD_USER_POOL_ID,
};

export const USER_POOL_CLIENT_IDS: { [key: string]: string } = {
    development: DEV_USER_POOL_CLIENT_ID,
    production: PROD_USER_POOL_CLIENT_ID,
};
