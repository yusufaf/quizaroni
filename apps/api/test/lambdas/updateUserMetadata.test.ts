import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import {
    CLIENT_EDITABLE_USER_METADATA_KEYS,
    SERVER_MANAGED_USER_METADATA_KEYS,
} from "@quizaroni/shared-types";
import { expectValidExpressionInput, resolveWrites } from "../helpers/expressionInput";

// #203/#185/#184: updateUserMetadata built placeholders from client keys, so a
// key could overwrite the server's updatedAt/updatedBy or build an invalid
// expression, and empty or missing updates 500'd.
// #207: it also wrote keys owned by other endpoints, such as gamification.

type Handler = (event: unknown, context: unknown) => Promise<{ statusCode: number; body: string }>;

let handler: Handler;
let MAX_UPDATES_BYTES: number;

beforeAll(() => {
    process.env.usersTable = "test-users";
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ({ handler, MAX_UPDATES_BYTES } = require("lambdas/updateUserMetadata/src/updateUserMetadata"));
});

afterEach(() => {
    jest.restoreAllMocks();
});

const run = async (
    body: unknown,
    lambda: unknown = { sub: "u1", username: "turtles" },
    rawBody = JSON.stringify(body)
) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: any[] = [];
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(DynamoDBDocumentClient.prototype, "send").mockImplementation((async (cmd: unknown) => {
        if (cmd instanceof UpdateCommand) updates.push(cmd.input);
        return { Item: { PK: "user#u1", SK: "userData", metadata: {} } };
    }) as never);

    const res = await handler(
        { requestContext: { authorizer: { lambda } }, body: rawBody },
        {}
    );
    return { statusCode: res.statusCode, updates };
};

describe("updateUserMetadata", () => {
    it("ignores updatedAt/updatedBy in updates (#203, #185)", async () => {
        const forged = "1999-01-01T00:00:00.000Z";

        const { statusCode, updates } = await run({
            updates: { defaultTheme: "dark", updatedAt: forged, updatedBy: "evil" },
        });

        expect(statusCode).toBe(200);
        expect(updates).toHaveLength(1);
        expectValidExpressionInput(updates[0]);
        expect(resolveWrites(updates[0])).toEqual({
            updatedAt: expect.any(String),
            updatedBy: "turtles",
            "metadata.defaultTheme": "dark",
        });
        expect(resolveWrites(updates[0]).updatedAt).not.toBe(forged);
    });

    it("drops keys outside the allowlist (#207)", async () => {
        const { statusCode, updates } = await run({
            updates: { theme: "dark", "my-field": 1, "a.b": 2, metadata: 3, PK: "user#other", updatedAt: "x" },
        });

        expect(statusCode).toBe(200);
        expectValidExpressionInput(updates[0]);
        expect(resolveWrites(updates[0])).toEqual({
            updatedAt: expect.any(String),
            updatedBy: "turtles",
        });
    });

    it.each(SERVER_MANAGED_USER_METADATA_KEYS)("does not write %s (#207)", async (key) => {
        const { statusCode, updates } = await run({
            updates: { [key]: { currentStreak: 999 }, defaultTheme: "light" },
        });

        expect(statusCode).toBe(200);
        expectValidExpressionInput(updates[0]);
        expect(resolveWrites(updates[0])).toEqual({
            updatedAt: expect.any(String),
            updatedBy: "turtles",
            "metadata.defaultTheme": "light",
        });
    });

    it("writes every client-editable key (#207)", async () => {
        const sent = Object.fromEntries(
            CLIENT_EDITABLE_USER_METADATA_KEYS.map((key, index) => [key, `value-${index}`])
        );

        const { statusCode, updates } = await run({ updates: sent });

        expect(statusCode).toBe(200);
        expectValidExpressionInput(updates[0]);
        const writes = resolveWrites(updates[0]);
        for (const [key, value] of Object.entries(sent)) {
            expect(writes[`metadata.${key}`]).toBe(value);
        }
    });

    it("returns 413 for allowed updates over MAX_UPDATES_BYTES without writing", async () => {
        const { statusCode, updates } = await run({
            updates: { avatar: { type: "dicebear", value: "x".repeat(MAX_UPDATES_BYTES) } },
        });

        expect(statusCode).toBe(413);
        expect(updates).toEqual([]);
    });

    // Preset avatars are stored as SVG data URIs; the largest bottts preset is about 36KB.
    it("writes a preset-sized avatar", async () => {
        const avatar = { type: "dicebear", value: "data:image/svg+xml;utf8," + "x".repeat(40_000) };

        const { statusCode, updates } = await run({ updates: { avatar } });

        expect(statusCode).toBe(200);
        expect(resolveWrites(updates[0])["metadata.avatar"]).toEqual(avatar);
    });

    it("isn't held to the size cap by a server-managed key it drops", async () => {
        const { statusCode, updates } = await run({
            updates: { gamification: { blob: "x".repeat(MAX_UPDATES_BYTES) }, defaultTheme: "light" },
        });

        expect(statusCode).toBe(200);
        expect(resolveWrites(updates[0])).toEqual({
            updatedAt: expect.any(String),
            updatedBy: "turtles",
            "metadata.defaultTheme": "light",
        });
    });

    const nested = (depth: number): unknown => (depth === 0 ? "leaf" : { child: nested(depth - 1) });

    it.each([
        ["a number above MAX_SAFE_INTEGER", { fontSizeScale: 2 ** 60 }],
        ["a number DynamoDB underflows", { fontSizeScale: 5e-324 }],
        ["an empty nested key", { visibleColumns: { "": true } }],
        ["a value nested 20 deep", { visibleColumns: nested(20) }],
    ])("returns 400 for %s without writing", async (_label, sent) => {
        const { statusCode, updates } = await run({ updates: sent });

        expect(statusCode).toBe(400);
        expect(updates).toEqual([]);
    });

    it("returns 400 for a number that parses to Infinity", async () => {
        const { statusCode, updates } = await run(undefined, undefined, '{"updates":{"fontSizeScale":1e400}}');

        expect(statusCode).toBe(400);
        expect(updates).toEqual([]);
    });

    // JSON.parse accepts this but JSON.stringify overflows the stack on it.
    it("returns 400, not a crash, for a value nested 100k deep", async () => {
        const rawBody = '{"updates":{"defaultTheme":' + "[".repeat(100_000) + "]".repeat(100_000) + "}}";

        const { statusCode, updates } = await run(undefined, undefined, rawBody);

        expect(statusCode).toBe(400);
        expect(updates).toEqual([]);
    });

    it("doesn't send #metadata when updates is empty (#184)", async () => {
        const { statusCode, updates } = await run({ updates: {} });

        expect(statusCode).toBe(200);
        expectValidExpressionInput(updates[0]);
        expect(updates[0].ExpressionAttributeNames).not.toHaveProperty("#metadata");
        expect(resolveWrites(updates[0])).toEqual({
            updatedAt: expect.any(String),
            updatedBy: "turtles",
        });
    });

    it.each([
        ["a null body", null],
        ["a missing updates", {}],
        ["null updates", { updates: null }],
        ["array updates", { updates: [] }],
        ["string updates", { updates: "x" }],
        ["an empty key", { updates: { "": 1 } }],
    ])("returns 400 for %s without writing (#184)", async (_label, body) => {
        const { statusCode, updates } = await run(body);

        expect(statusCode).toBe(400);
        expect(updates).toEqual([]);
    });

    it("returns 400 for a body that isn't JSON", async () => {
        const { statusCode, updates } = await run(undefined, undefined, "{updates:");

        expect(statusCode).toBe(400);
        expect(updates).toEqual([]);
    });
});
