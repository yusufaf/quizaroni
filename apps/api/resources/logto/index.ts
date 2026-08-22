// Logto endpoint and API resource identifier, by deploymentType. Mirrors
// resources/cognito/index.ts's shape, which this replaces for auth. Same
// pattern used in team-builder-cdk's resources/logto/index.ts.
//
// endpoint starts pointed at the Fly-provided hostname (logto-flyio isn't cut
// over to auth.yusufaf.dev yet — see that repo's README). Update both entries
// to "https://auth.yusufaf.dev" once the DNS cutover lands; nothing else in
// the authorizer needs to change, since it derives issuer/JWKS URI from this
// value.
export const LOGTO_ENDPOINT: { [key: string]: string } = {
    development: "https://logto-af.fly.dev",
    production: "https://logto-af.fly.dev",
};

// The API resource identifier created in the Logto console (Authorization >
// API resources), under the "Quizaroni" organization. This is what the
// authorizer checks the access token's `aud` claim against — the whole point
// being that a token issued for a different project's API resource (e.g.
// NBA Central's) is rejected here.
export const LOGTO_API_RESOURCE: { [key: string]: string } = {
    development: "https://api.quizaroni.yusufaf.dev",
    production: "https://api.quizaroni.yusufaf.dev",
};

// Signing key for the "Quizaroni user created" webhook (Console > Webhooks),
// registered against the User.Created event. Logto generates this key when
// the webhook is created; set it in apps/api/.env (see .env.example) — never
// commit it. logtoUserCreatedWebhook.ts uses it to verify the
// logto-signature-sha-256 header so the endpoint can't be spoofed.
export const LOGTO_WEBHOOK_SIGNING_KEY = process.env.LOGTO_WEBHOOK_SIGNING_KEY ?? "";
