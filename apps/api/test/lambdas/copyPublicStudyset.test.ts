import { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { S3Client, CopyObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { PUBLIC_STUDYSET_PK } from "resources/dynamo/publicSharing";

// #140: a signed-in user saves someone else's public set into their library.

type Handler = (event: unknown, context: unknown) => Promise<{ statusCode: number; body: string }>;

let copyPublicStudyset: Handler;

const SOURCE_UUID = "11111111-1111-4111-8111-111111111111";
const AUTHOR_UUID = "22222222-2222-4222-8222-222222222222";
const CALLER_UUID = "33333333-3333-4333-8333-333333333333";
const TERM_KEY = `${SOURCE_UUID}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`;
const DEFINITION_KEY = `${SOURCE_UUID}/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb`;
const NEW_KEY_RE = /^([0-9a-f-]{36})\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

beforeAll(() => {
    process.env.mainTable = "test-main";
    process.env.mainBucket = "test-bucket";
    /* eslint-disable @typescript-eslint/no-var-requires */
    ({ handler: copyPublicStudyset } = require("../../service/lambdas/copyPublicStudyset/src/copyPublicStudyset"));
    /* eslint-enable @typescript-eslint/no-var-requires */
});

beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
    jest.restoreAllMocks();
});

const publishedSource = (overrides: Record<string, unknown> = {}) => ({
    PK: `userUUID#${AUTHOR_UUID}`,
    SK: `studyset#${SOURCE_UUID}`,
    PK2: PUBLIC_STUDYSET_PK,
    SK2: `studyset#${SOURCE_UUID}`,
    userUUID: AUTHOR_UUID,
    studysetUUID: SOURCE_UUID,
    username: "turtles",
    title: "Cell biology",
    description: "Organelles",
    labels: ["Biology"],
    categories: ["Organelles"],
    favorited: true,
    lastViewed: "2026-10-14T00:00:00.000Z",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-15T00:00:00.000Z",
    subject: "science",
    publishedAt: "2026-10-10T00:00:00.000Z",
    metadata: { publiclyViewable: true, terminology: "Term" },
    cards: [
        {
            cardUUID: "c1",
            term: "Mitochondria",
            definition: "Powerhouse",
            notes: [{ noteUUID: "n1", text: "secret note" }],
            categories: ["Organelles"],
            important: true,
            files: [
                { key: TERM_KEY, name: "a.png", size: 1, signedURL: "https://x", association: "term" },
                { key: DEFINITION_KEY, name: "b.png", size: 2, signedURL: "https://y", association: "definition" },
            ],
        },
    ],
    ...overrides,
});

type DynamoCalls = { puts: Record<string, unknown>[]; gets: Record<string, unknown>[]; queries: number };

// Any write other than the copy's Put throws, so the original can't be touched.
// `getItem: undefined` means the Get finds nothing, so it's checked with `in`.
const fakeDynamo = (
    options: { queryItems?: Record<string, unknown>[]; getItem?: Record<string, unknown> | undefined } = {}
) => {
    const { queryItems = [publishedSource()] } = options;
    const getItem = "getItem" in options ? options.getItem : publishedSource();
    const calls: DynamoCalls = { puts: [], gets: [], queries: 0 };
    jest.spyOn(DynamoDBDocumentClient.prototype, "send").mockImplementation((async (command: unknown) => {
        if (command instanceof QueryCommand) {
            calls.queries += 1;
            return { Items: structuredClone(queryItems) };
        }
        if (command instanceof GetCommand) {
            calls.gets.push({ ...command.input });
            return { Item: structuredClone(getItem) };
        }
        if (command instanceof PutCommand) {
            calls.puts.push(structuredClone(command.input.Item) as Record<string, unknown>);
            return {};
        }
        throw new Error("unexpected command");
    }) as never);
    return calls;
};

const fakeS3 = (fail?: string) => {
    const copies: Record<string, unknown>[] = [];
    const deletes: Record<string, unknown>[] = [];
    jest.spyOn(S3Client.prototype, "send").mockImplementation((async (command: unknown) => {
        if (command instanceof CopyObjectCommand) {
            copies.push({ ...command.input });
            if (fail) throw Object.assign(new Error("x"), { name: fail });
            return {};
        }
        if (command instanceof DeleteObjectCommand) {
            deletes.push({ ...command.input });
            return {};
        }
        throw new Error("unexpected S3 command");
    }) as never);
    return { copies, deletes };
};

const invoke = (body: unknown, lambda: Record<string, unknown> = { sub: CALLER_UUID, username: "reader" }) =>
    copyPublicStudyset(
        {
            requestContext: { authorizer: { lambda } },
            body: typeof body === "string" ? body : JSON.stringify(body),
        },
        {}
    );

const filesOf = (item: Record<string, unknown>) =>
    (item.cards as { files: { key: string }[] }[]).flatMap((card) => card.files);

describe("copyPublicStudyset", () => {
    it("returns 400 for a missing or malformed id", async () => {
        const calls = fakeDynamo();
        fakeS3();

        for (const body of [{}, { studysetUUID: "not-a-uuid" }, { studysetUUID: 5 }, "{not json"]) {
            const result = await invoke(body);
            expect(result.statusCode).toBe(400);
        }
        expect(calls.queries).toBe(0);
        expect(calls.gets).toEqual([]);
        expect(calls.puts).toEqual([]);
    });

    it("returns 404 for a private or unknown set", async () => {
        const calls = fakeDynamo({ queryItems: [] });
        fakeS3();

        const result = await invoke({ studysetUUID: SOURCE_UUID });

        expect(result.statusCode).toBe(404);
        expect(JSON.parse(result.body).message).toBe("This study set is private or does not exist.");
        expect(calls.puts).toEqual([]);
    });

    it("returns 404 for a hidden set", async () => {
        const hidden = publishedSource({ moderation: { hiddenAt: "2026-10-16T00:00:00.000Z" } });
        const calls = fakeDynamo({ queryItems: [hidden], getItem: hidden });
        fakeS3();

        expect((await invoke({ studysetUUID: SOURCE_UUID })).statusCode).toBe(404);
        expect(calls.puts).toEqual([]);
    });

    it("returns 404 when only a pre-#125 copy carries the id", async () => {
        const oldCopy = publishedSource({
            SK: "studyset#55555555-5555-4555-8555-555555555555",
            studysetUUID: "55555555-5555-4555-8555-555555555555",
        });
        const calls = fakeDynamo({ queryItems: [oldCopy], getItem: oldCopy });
        fakeS3();

        expect((await invoke({ studysetUUID: SOURCE_UUID })).statusCode).toBe(404);
        expect(calls.gets).toEqual([]);
        expect(calls.puts).toEqual([]);
    });

    it.each([
        ["unpublished", (() => {
            const { PK2: _PK2, SK2: _SK2, ...rest } = publishedSource();
            return { ...rest, metadata: { publiclyViewable: false } };
        })()],
        ["taken down", publishedSource({ moderation: { hiddenAt: "2026-10-16T00:00:00.000Z" } })],
        ["deleted", undefined],
    ])("returns 404 when the set was %s after the index read", async (_case, getItem) => {
        const calls = fakeDynamo({ getItem });
        const { copies } = fakeS3();

        expect((await invoke({ studysetUUID: SOURCE_UUID })).statusCode).toBe(404);
        expect(calls.gets).toEqual([
            {
                TableName: "test-main",
                Key: { PK: `userUUID#${AUTHOR_UUID}`, SK: `studyset#${SOURCE_UUID}` },
                ConsistentRead: true,
            },
        ]);
        expect(copies).toEqual([]);
        expect(calls.puts).toEqual([]);
    });

    it("saves a private copy into the caller's library", async () => {
        const calls = fakeDynamo();
        fakeS3();

        const result = await invoke({ studysetUUID: SOURCE_UUID });

        expect(result.statusCode).toBe(200);
        expect(calls.puts).toHaveLength(1);
        const [item] = calls.puts;
        expect(item.PK).toBe(`userUUID#${CALLER_UUID}`);
        expect(item.userUUID).toBe(CALLER_UUID);
        expect(item.username).toBe("reader");
        expect(item.studysetUUID).not.toBe(SOURCE_UUID);
        expect(item.SK).toBe(`studyset#${item.studysetUUID}`);
        expect(item.copiedFrom).toEqual({ studysetUUID: SOURCE_UUID });
        expect(item.labels).toEqual([]);
        expect((item.cards as { notes: unknown[] }[]).every((card) => card.notes.length === 0)).toBe(true);
        expect((item.metadata as { publiclyViewable: boolean }).publiclyViewable).toBe(false);
        expect(item).not.toHaveProperty("PK2");
        expect(item).not.toHaveProperty("subject");
        expect(JSON.stringify(item)).not.toContain(AUTHOR_UUID);

        const { studyset } = JSON.parse(result.body);
        expect(studyset).not.toHaveProperty("PK");
        expect(studyset).not.toHaveProperty("SK");
        expect(studyset.studysetUUID).toBe(item.studysetUUID);
    });

    it("copies images to new keys and leaves the original alone", async () => {
        const calls = fakeDynamo();
        const { copies, deletes } = fakeS3();

        await invoke({ studysetUUID: SOURCE_UUID });

        const [item] = calls.puts;
        const keys = filesOf(item).map((file) => file.key);
        expect(keys).toHaveLength(2);
        for (const key of keys) {
            expect(key).toMatch(NEW_KEY_RE);
            expect(NEW_KEY_RE.exec(key)?.[1]).toBe(item.studysetUUID);
            expect([TERM_KEY, DEFINITION_KEY]).not.toContain(key);
        }
        expect(copies.map((copy) => copy.CopySource).sort()).toEqual(
            [`test-bucket/${TERM_KEY}`, `test-bucket/${DEFINITION_KEY}`].sort()
        );
        expect(copies.map((copy) => copy.Key).sort()).toEqual([...keys].sort());
        expect(deletes).toEqual([]);
        expect(calls.puts.every((put) => put.SK !== `studyset#${SOURCE_UUID}`)).toBe(true);
    });

    it("does not store the copy when an image copy fails", async () => {
        const calls = fakeDynamo();
        fakeS3("AccessDenied");

        const result = await invoke({ studysetUUID: SOURCE_UUID });

        expect(result.statusCode).toBe(500);
        expect(calls.puts).toEqual([]);
    });

    it("works when the token has no username", async () => {
        const calls = fakeDynamo();
        fakeS3();

        const result = await invoke({ studysetUUID: SOURCE_UUID }, { sub: CALLER_UUID });

        expect(result.statusCode).toBe(200);
        expect(calls.puts[0].username).toBeNull();
    });

    it("lets an author save their own set", async () => {
        const calls = fakeDynamo();
        fakeS3();

        const result = await invoke({ studysetUUID: SOURCE_UUID }, { sub: AUTHOR_UUID, username: "turtles" });

        expect(result.statusCode).toBe(200);
        expect(calls.puts[0].PK).toBe(`userUUID#${AUTHOR_UUID}`);
        expect(calls.puts[0].studysetUUID).not.toBe(SOURCE_UUID);
    });
});
