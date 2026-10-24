import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

// #188: delete-file deleted whatever key it was sent, including another
// user's card files.

type Handler = (event: unknown, context: unknown) => Promise<{ statusCode: number; body: string }>;

let handler: Handler;

const STUDYSET_UUID = "11111111-1111-4111-8111-111111111111";
const USER_UUID = "22222222-2222-4222-8222-222222222222";
const KEY = `${STUDYSET_UUID}/44444444-4444-4444-8444-444444444444`;

beforeAll(() => {
    process.env.mainTable = "test-main";
    process.env.mainBucket = "test-bucket";
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ({ handler } = require("../../service/lambdas/deleteFile/src/deleteFile"));
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let s3Calls: any[];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let gets: any[];
let storedItem: Record<string, unknown> | undefined;

beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    s3Calls = [];
    gets = [];
    storedItem = { studysetUUID: STUDYSET_UUID };
    jest.spyOn(S3Client.prototype, "send").mockImplementation((async (command: unknown) => {
        s3Calls.push(command);
        return {};
    }) as never);
    jest.spyOn(DynamoDBDocumentClient.prototype, "send").mockImplementation((async (command: unknown) => {
        if (command instanceof GetCommand) {
            gets.push(command.input);
            return { Item: storedItem };
        }
        throw new Error("unexpected DynamoDB command");
    }) as never);
});

afterEach(() => {
    jest.restoreAllMocks();
});

const invoke = (body: Record<string, unknown>) =>
    handler(
        {
            requestContext: { authorizer: { lambda: { sub: USER_UUID, username: "turtles" } } },
            body: JSON.stringify(body),
        },
        {}
    );

describe("deleteFile handler", () => {
    it("rejects a key under a set the caller doesn't own", async () => {
        storedItem = undefined;

        const res = await invoke({ key: KEY });

        expect(res.statusCode).toBe(403);
        expect(s3Calls).toEqual([]);
        expect(gets).toEqual([
            expect.objectContaining({
                TableName: "test-main",
                Key: { PK: `userUUID#${USER_UUID}`, SK: `studyset#${STUDYSET_UUID}` },
                ConsistentRead: true,
            }),
        ]);
    });

    it("rejects a key whose set item is only a stub", async () => {
        storedItem = { lastViewed: "2026-10-01T00:00:00.000Z" };

        const res = await invoke({ key: KEY });

        expect(res.statusCode).toBe(403);
        expect(s3Calls).toEqual([]);
    });

    it("deletes a key under a set the caller owns", async () => {
        const res = await invoke({ key: KEY });

        expect(res.statusCode).toBe(200);
        expect(s3Calls).toHaveLength(1);
        expect(s3Calls[0]).toBeInstanceOf(DeleteObjectCommand);
        expect(s3Calls[0].input).toEqual({ Bucket: "test-bucket", Key: KEY });
    });

    it.each([
        ["a missing key", {}],
        ["an empty set segment", { key: "/44444444-4444-4444-8444-444444444444" }],
        ["a non-UUID prefix", { key: "notauuid/x" }],
    ])("rejects %s without touching DynamoDB or S3", async (_label, body) => {
        const res = await invoke(body);

        expect(res.statusCode).toBe(400);
        expect(gets).toEqual([]);
        expect(s3Calls).toEqual([]);
    });
});
