// Logto endpoint and API resource identifier, by deploymentType. Mirrors
// resources/cognito/index.ts's shape, which this replaces for auth. Same
// pattern used in team-builder-cdk's resources/logto/index.ts.
//
// Must match the `iss` Logto puts in its tokens: the authorizer derives the
// issuer and JWKS URI from this value, so a mismatch rejects every request.
// Logto has been cut over to auth.yusufaf.dev, and its discovery document at
// /oidc/.well-known/openid-configuration reports that host as the issuer,
// even for sign-ins that go through the old logto-af.fly.dev hostname.
export const LOGTO_ENDPOINT: { [key: string]: string } = {
    development: "https://auth.yusufaf.dev",
    production: "https://auth.yusufaf.dev",
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

// Resource indicator of the Management API on a self-hosted (OSS) Logto. The
// M2M token requested for it has the single `all` scope, i.e. full admin.
export const LOGTO_MANAGEMENT_API_RESOURCE = "https://default.logto.app/api";

// Machine-to-machine app (Console > Applications > "Quizaroni API username
// sync") with the "Logto Management API access" role. updateUsername.ts uses
// it to change a user's username. Set both in apps/api/.env (see
// .env.example) — never commit the secret.
export const LOGTO_M2M_APP_ID = process.env.LOGTO_M2M_APP_ID ?? "";
export const LOGTO_M2M_APP_SECRET = process.env.LOGTO_M2M_APP_SECRET ?? "";
