import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// #188: part URLs were presigned for any key, so a caller could overwrite
// another user's card file.

jest.mock("@aws-sdk/s3-request-presigner", () => ({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getSignedUrl: jest.fn(async (_client: unknown, cmd: any) => `https://signed.example/${cmd.input.PartNumber}`),
}));

type Handler = (event: unknown, context: unknown) => Promise<{ statusCode: number; body: string }>;

let handler: Handler;

const STUDYSET_UUID = "11111111-1111-4111-8111-111111111111";
const USER_UUID = "22222222-2222-4222-8222-222222222222";
const KEY = `${STUDYSET_UUID}/44444444-4444-4444-8444-444444444444`;

beforeAll(() => {
    process.env.mainTable = "test-main";
    process.env.mainBucket = "test-bucket";
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ({ handler } = require("../../service/lambdas/getMultipartSignedUploadUrls/src/getMultipartSignedUploadUrls"));
});

let dynamoSend: jest.SpyInstance;

beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    (getSignedUrl as jest.Mock).mockClear();
    dynamoSend = jest
        .spyOn(DynamoDBDocumentClient.prototype, "send")
        .mockResolvedValue({ Item: { studysetUUID: STUDYSET_UUID } } as never);
});

afterEach(() => {
    jest.restoreAllMocks();
});

const invoke = (body: Record<string, unknown> = {}) =>
    handler(
        {
            requestContext: { authorizer: { lambda: { sub: USER_UUID, username: "turtles" } } },
            body: JSON.stringify({ key: KEY, uploadId: "up-1", numParts: 2, ...body }),
        },
        {}
    );

describe("getMultipartSignedUploadUrls handler", () => {
    it("presigns one URL per part for a set the caller owns", async () => {
        const res = await invoke();

        expect(res.statusCode).toBe(200);
        expect(JSON.parse(res.body).signedURLs).toEqual({
            0: "https://signed.example/1",
            1: "https://signed.example/2",
        });
    });

    it("rejects a key under a set the caller doesn't own", async () => {
        dynamoSend.mockResolvedValue({} as never);

        const res = await invoke();

        expect(res.statusCode).toBe(403);
        expect(getSignedUrl).not.toHaveBeenCalled();
        expect(dynamoSend.mock.calls[0][0].input).toMatchObject({
            Key: { PK: `userUUID#${USER_UUID}`, SK: `studyset#${STUDYSET_UUID}` },
            ConsistentRead: true,
        });
    });

    it("rejects a malformed key without touching DynamoDB", async () => {
        const res = await invoke({ key: "notauuid/x" });

        expect(res.statusCode).toBe(400);
        expect(dynamoSend).not.toHaveBeenCalled();
        expect(getSignedUrl).not.toHaveBeenCalled();
    });
});
