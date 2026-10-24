import { S3Client, CompleteMultipartUploadCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

// #152: the file's name was read off its S3 key. Keys are now opaque, so the
// original name has to come from the client.

jest.mock("@aws-sdk/s3-request-presigner", () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getSignedUrl: jest.fn(async (_client: unknown, cmd: any) => `https://signed.example/${cmd.input.Key}`),
}));

type Handler = (event: unknown, context: unknown) => Promise<{ statusCode: number; body: string }>;

let handler: Handler;

const STUDYSET_UUID = "11111111-1111-4111-8111-111111111111";
const USER_UUID = "22222222-2222-4222-8222-222222222222";
const OPAQUE_KEY = `${STUDYSET_UUID}/44444444-4444-4444-8444-444444444444`;

beforeAll(() => {
    process.env.mainTable = "test-main";
    process.env.mainBucket = "test-bucket";
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ({ handler } = require("../../service/lambdas/completeMultipartUpload/src/completeMultipartUpload"));
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let updates: any[];
let s3Commands: unknown[];
let storedItem: Record<string, unknown> | undefined;

beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    updates = [];
    s3Commands = [];
    storedItem = { studysetUUID: STUDYSET_UUID, cards: [{ cardUUID: "c1", files: [] }] };
    jest.spyOn(S3Client.prototype, "send").mockImplementation((async (command: unknown) => {
        s3Commands.push(command);
        if (command instanceof CompleteMultipartUploadCommand) return {};
        if (command instanceof HeadObjectCommand) return { ContentLength: 5 };
        throw new Error("unexpected S3 command");
    }) as never);
    jest.spyOn(DynamoDBDocumentClient.prototype, "send").mockImplementation((async (command: unknown) => {
        if (command instanceof GetCommand) return { Item: storedItem };
        if (command instanceof UpdateCommand) {
            updates.push(command.input);
            return {};
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
            body: JSON.stringify({ key: OPAQUE_KEY, parts: [], uploadId: "u", ...body }),
        },
        {}
    );

describe("completeMultipartUpload handler", () => {
    it("names the file after the uploaded file, not its storage key", async () => {
        const res = await invoke({ fileName: "photo.png" });

        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.body)).toMatchObject({ name: "photo.png", key: OPAQUE_KEY, size: 5 });
    });

    it("stores the original name on the card", async () => {
        await invoke({ fileName: "photo.png", studysetUUID: STUDYSET_UUID, cardUUID: "c1", association: "term" });

        expect(updates).toHaveLength(1);
        expect(updates[0].ExpressionAttributeValues[":newCards"][0].files[0]).toMatchObject({
            name: "photo.png",
            key: OPAQUE_KEY,
            association: "term",
        });
    });

    it("falls back to the key's last segment when no fileName is sent", async () => {
        const res = await invoke({});

        expect(JSON.parse(res.body).name).toBe("44444444-4444-4444-8444-444444444444");
    });

    it("caps a long fileName at 255 characters", async () => {
        const res = await invoke({ fileName: "a".repeat(300) });

        expect(JSON.parse(res.body).name).toBe("a".repeat(255));
    });

    // #188: any caller could complete an upload under another user's set.
    it("rejects a key under a set the caller doesn't own", async () => {
        storedItem = undefined;

        const res = await invoke({ fileName: "photo.png" });

        expect(res.statusCode).toBe(403);
        expect(s3Commands).toEqual([]);
        expect(updates).toEqual([]);
    });

    it("rejects a studysetUUID that doesn't match the key's set", async () => {
        const res = await invoke({ studysetUUID: "99999999-9999-4999-8999-999999999999", cardUUID: "c1" });

        expect(res.statusCode).toBe(400);
        expect(s3Commands).toEqual([]);
        expect(updates).toEqual([]);
    });

    it("rejects a malformed key", async () => {
        const res = await invoke({ key: "notauuid/x" });

        expect(res.statusCode).toBe(400);
        expect(s3Commands).toEqual([]);
    });
});
