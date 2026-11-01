// Client for the few Logto Management API calls the API makes, authenticated
// as the M2M app configured in resources/logto. Env is read per call so tests
// can set it.

const TOKEN_EXPIRY_SKEW_MS = 60_000;

// Module scope, so warm invocations reuse the token.
let cachedToken: { token: string; expiresAt: number } | undefined;

export const resetManagementTokenCache = () => {
    cachedToken = undefined;
};

const readConfig = () => {
    const {
        logtoEndpoint = '',
        logtoM2mAppId = '',
        logtoM2mAppSecret = '',
        logtoManagementApiResource = '',
    } = process.env;
    if (!logtoEndpoint || !logtoM2mAppId || !logtoM2mAppSecret || !logtoManagementApiResource) {
        throw new Error('Logto Management API is not configured');
    }
    return { logtoEndpoint, logtoM2mAppId, logtoM2mAppSecret, logtoManagementApiResource };
};

type Config = ReturnType<typeof readConfig>;

const getManagementToken = async (config: Config): Promise<string> => {
    if (cachedToken && cachedToken.expiresAt - TOKEN_EXPIRY_SKEW_MS > Date.now()) {
        return cachedToken.token;
    }
    const credentials = Buffer.from(`${config.logtoM2mAppId}:${config.logtoM2mAppSecret}`).toString('base64');
    const response = await fetch(`${config.logtoEndpoint}/oidc/token`, {
        method: 'POST',
        headers: {
            authorization: `Basic ${credentials}`,
            'content-type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            grant_type: 'client_credentials',
            resource: config.logtoManagementApiResource,
            scope: 'all',
        }).toString(),
    });
    if (!response.ok) {
        throw new Error(`Logto token request failed: ${response.status}`);
    }
    const { access_token, expires_in } = (await response.json()) as {
        access_token: string;
        expires_in: number;
    };
    cachedToken = { token: access_token, expiresAt: Date.now() + expires_in * 1000 };
    return access_token;
};

const readJson = async (response: Response): Promise<Record<string, unknown>> => {
    try {
        return ((await response.json()) as Record<string, unknown> | null) ?? {};
    } catch {
        return {};
    }
};

export type UpdateLogtoUsernameResult = 'updated' | 'taken';

export const updateLogtoUsername = async ({
    userId,
    username,
}: {
    userId: string;
    username: string;
}): Promise<UpdateLogtoUsernameResult> => {
    const config = readConfig();

    const patch = async () =>
        fetch(`${config.logtoEndpoint}/api/users/${encodeURIComponent(userId)}`, {
            method: 'PATCH',
            headers: {
                authorization: `Bearer ${await getManagementToken(config)}`,
                // Without it Logto parses no body, its partial guard passes,
                // and it returns 200 with nothing changed.
                'content-type': 'application/json',
            },
            body: JSON.stringify({ username }),
        });

    let response = await patch();
    if (response.status === 401) {
        // The cached token was revoked or the app's secret rotated.
        resetManagementTokenCache();
        response = await patch();
    }

    const body = await readJson(response);
    if (response.status === 200) {
        if (body.username !== username) {
            throw new Error('Logto username update did not apply');
        }
        return 'updated';
    }
    if (response.status === 422 && body.code === 'user.username_already_in_use') {
        return 'taken';
    }
    const code = typeof body.code === 'string' ? body.code : '';
    throw new Error(`Logto username update failed: ${response.status} ${code}`.trim());
};
