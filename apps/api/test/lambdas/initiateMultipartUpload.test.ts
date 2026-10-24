import { S3Client, CreateMultipartUploadCommand } from "@aws-sdk/client-s3";
import { isOpaqueCardFileKey } from "utilities/cardFiles";

// #152: uploads were keyed `${studysetUUID}/${userUUID}/${fileName}`, and a
// presigned URL carries its key, so public image URLs leaked both.

type Handler = (event: unknown, context: unknown) => Promise<{ statusCode: number; body: string }>;

let handler: Handler;

const STUDYSET_UUID = "11111111-1111-4111-8111-111111111111";
const USER_UUID = "22222222-2222-4222-8222-222222222222";

beforeAll(() => {
    process.env.mainBucket = "test-bucket";
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ({ handler } = require("../../service/lambdas/initiateMultipartUpload/src/initiateMultipartUpload"));
});

let send: jest.SpyInstance;

beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    send = jest.spyOn(S3Client.prototype, "send").mockResolvedValue({ UploadId: "up-1" } as never);
});

afterEach(() => {
    jest.restoreAllMocks();
});

const invoke = () =>
    handler(
        {
            requestContext: { authorizer: { lambda: { sub: USER_UUID, username: "turtles" } } },
            body: JSON.stringify({ studysetUUID: STUDYSET_UUID, fileName: "my photo.png", contentType: "image/png" }),
        },
        {}
    );

describe("initiateMultipartUpload handler", () => {
    it("keys the upload under the set and an opaque id, not the owner or file name", async () => {
        const res = await invoke();

        expect(res.statusCode).toBe(200);
        const { key, uploadId } = JSON.parse(res.body);
        expect(uploadId).toBe("up-1");
        expect(isOpaqueCardFileKey(key, STUDYSET_UUID)).toBe(true);
        expect(key).not.toContain(USER_UUID);
        expect(key).not.toContain("photo");

        const command = send.mock.calls[0][0];
        expect(command).toBeInstanceOf(CreateMultipartUploadCommand);
        expect(command.input).toMatchObject({ Bucket: "test-bucket", Key: key, ContentType: "image/png" });
    });

    it("gives two uploads of the same file different keys", async () => {
        const first = JSON.parse((await invoke()).body).key;
        const second = JSON.parse((await invoke()).body).key;

        expect(first).not.toBe(second);
    });
});
