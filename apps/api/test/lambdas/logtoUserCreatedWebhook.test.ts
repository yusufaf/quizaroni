import { createHmac } from "node:crypto";

// Only the signature-verification logic is tested here — the real,
// security-critical algorithm this handler runs before trusting a request
// claiming to be Logto. The rest of the handler (the DynamoDB write) has no
// real-service test double available in this repo (no lambda here is
// DynamoDB-tested; see getUser.ts/createStudyset.ts) and is exercised
// instead by real browser sign-in against the live logto-af.fly.dev
// instance — see the auth migration plan's Phase 3 gate.
//
// The event-shape check below is a regression test for a real bug caught in
// production: the handler used to read the user off `payload.user`, but
// Logto's actual User.Created webhook body nests it under `payload.data` —
// so every real delivery silently fell into the "Ignored" branch and no
// user row was ever written. See a captured live delivery in
// logto-migration-phase3-handoff.md.

const SIGNING_KEY = "test-signing-key";

let verifySignature: (rawBody: string, signature: string) => boolean;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let extractCreatedUser: (payload: any) => unknown;

beforeAll(() => {
    process.env.logtoWebhookSigningKey = SIGNING_KEY;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ({ verifySignature, extractCreatedUser } = require("../../service/lambdas/logtoUserCreatedWebhook/src/logtoUserCreatedWebhook"));
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

describe("logtoUserCreatedWebhook extractCreatedUser", () => {
    // Real payload captured from a live logto-af.fly.dev delivery — the
    // shape that broke the old `payload.user` read.
    const liveDeliveryBody = {
        ip: "50.47.150.17",
        data: {
            id: "vhx1qw0rb2mk",
            name: "Test User",
            avatar: null,
            profile: {},
            username: "test1",
            createdAt: 1787550941863,
            updatedAt: 1787550941863,
            customData: {},
            identities: {},
            hasPassword: true,
            isSuspended: false,
            lastSignInAt: null,
            primaryEmail: "evil.elmo5@gmail.com",
            primaryPhone: null,
            applicationId: null,
        },
        path: "/users",
        event: "User.Created",
        hookId: "pibtrmxj8q7ieork21elx",
        method: "POST",
        params: {},
        status: 200,
        createdAt: "2026-08-24T05:55:41.889Z",
        matchedRoute: "/users",
    };

    it("reads the created user out of a real Logto delivery body", () => {
        expect(extractCreatedUser(liveDeliveryBody)).toEqual(liveDeliveryBody.data);
    });

    it("returns null for a payload with no data (regression: used to read `.user`)", () => {
        expect(
            extractCreatedUser({ event: "User.Created", user: liveDeliveryBody.data })
        ).toBeNull();
    });

    it("returns null for a non-User.Created event", () => {
        expect(
            extractCreatedUser({ event: "User.Deleted", data: liveDeliveryBody.data })
        ).toBeNull();
    });
});
