import { ConfigError } from '../config';
import { AUTH_BASE_PATH } from './auth';

export const SOCIAL_PROVIDER_IDS = ['google', 'github'] as const;
export type SocialProviderId = (typeof SOCIAL_PROVIDER_IDS)[number];

export type SocialProviderConfig = { clientId: string; clientSecret: string };
export type SocialConfig = Partial<
    Record<SocialProviderId, SocialProviderConfig>
>;

const ENV_NAMES = {
    google: ['QZ_GOOGLE_CLIENT_ID', 'QZ_GOOGLE_CLIENT_SECRET'],
    github: ['QZ_GITHUB_CLIENT_ID', 'QZ_GITHUB_CLIENT_SECRET'],
} as const satisfies Record<SocialProviderId, readonly [string, string]>;

export const SOCIAL_ENV_VARS = SOCIAL_PROVIDER_IDS.flatMap(
    (id) => ENV_NAMES[id]
);

const LABELS: Record<SocialProviderId, string> = {
    google: 'Google',
    github: 'GitHub',
};

// Errors name the variables, never their values.
export function parseSocialConfig(
    env: Record<string, string | undefined>
): SocialConfig {
    const config: SocialConfig = {};
    for (const id of SOCIAL_PROVIDER_IDS) {
        const [idName, secretName] = ENV_NAMES[id];
        const clientId = env[idName]?.trim() || undefined;
        const clientSecret = env[secretName]?.trim() || undefined;
        if (clientId === undefined && clientSecret === undefined) continue;
        if (clientId === undefined || clientSecret === undefined) {
            throw new ConfigError(
                `${idName} and ${secretName} must be set together`
            );
        }
        config[id] = { clientId, clientSecret };
    }
    return config;
}

export function socialProviderIds(config: SocialConfig): SocialProviderId[] {
    return SOCIAL_PROVIDER_IDS.filter((id) => config[id] !== undefined);
}

// The full URI is printed only for a configured public URL; otherwise the
// real one isn't known yet (it may come from the setup wizard or the bound port).
export function describeSocial(
    config: SocialConfig,
    configuredPublicUrl: string | undefined
): string {
    const ids = socialProviderIds(config);
    if (ids.length === 0) {
        return 'Sign-in with Google or GitHub is not configured (QZ_GOOGLE_CLIENT_ID, QZ_GITHUB_CLIENT_ID).';
    }
    const uris = ids.map(
        (id) => `${configuredPublicUrl ?? ''}${AUTH_BASE_PATH}/callback/${id}`
    );
    const where = configuredPublicUrl
        ? 'Redirect URIs to register'
        : 'Redirect URIs to register, relative to the public URL';
    return `Sign-in providers: ${ids.map((id) => LABELS[id]).join(', ')}. ${where}: ${uris.join(', ')}`;
}

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]']);

export function socialUrlWarning(
    config: SocialConfig,
    publicUrl: string
): string | undefined {
    if (socialProviderIds(config).length === 0) return undefined;
    let url: URL;
    try {
        url = new URL(publicUrl);
    } catch {
        return undefined;
    }
    if (url.protocol !== 'http:' || LOCAL_HOSTNAMES.has(url.hostname)) {
        return undefined;
    }
    return `Public URL ${publicUrl} is plain HTTP; Google and GitHub sign-in expect an HTTPS redirect URI. Serve Quizaroni over HTTPS.`;
}
