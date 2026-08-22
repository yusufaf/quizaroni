import { createHmac } from "node:crypto";

// Only the signature-verification logic is tested here — the real,
// security-critical algorithm this handler runs before trusting a request
// claiming to be Logto. The rest of the handler (the DynamoDB write) has no
// real-service test double available in this repo (no lambda here is
// DynamoDB-tested; see getUser.ts/createStudyset.ts) and is exercised
// instead by real browser sign-in against the live logto-af.fly.dev
// instance — see the auth migration plan's Phase 3 gate.

const SIGNING_KEY = "test-signing-key";

let verifySignature: (rawBody: string, signature: string) => boolean;

beforeAll(() => {
    process.env.logtoWebhookSigningKey = SIGNING_KEY;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ({ verifySignature } = require("../../service/lambdas/logtoUserCreatedWebhook/src/logtoUserCreatedWebhook"));
});

const sign = (body: string, key: string = SIGNING_KEY) =>
    createHmac("sha256", key).update(body).digest("hex");

describe("logtoUserCreatedWebhook verifySignature", () => {
    it("accepts a signature computed with the real signing key", () => {
        const body = JSON.stringify({ event: "User.Created" });

        expect(verifySignature(body, sign(body))).toBe(true);
    });

    it("rejects a signature computed with the wrong key", () => {
        const body = JSON.stringify({ event: "User.Created" });

        expect(verifySignature(body, sign(body, "wrong-key"))).toBe(false);
    });

    it("rejects a signature for a different body (tampered payload)", () => {
        const body = JSON.stringify({ event: "User.Created" });
        const tamperedSignature = sign(JSON.stringify({ event: "User.Deleted" }));

        expect(verifySignature(body, tamperedSignature)).toBe(false);
    });

    it("rejects a missing signature", () => {
        const body = JSON.stringify({ event: "User.Created" });

        expect(verifySignature(body, "")).toBe(false);
    });
});
