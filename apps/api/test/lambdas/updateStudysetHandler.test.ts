import { S3Client, CopyObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBDocumentClient, GetCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { isOpaqueCardFileKey } from "utilities/cardFiles";
import { expectValidExpressionInput } from "../helpers/expressionInput";

// #188: updateStudyset stored any card file key the client sent and deleted
// removed keys whatever set they belonged to, so a save could name and later
// delete another user's card files.

type Handler = (event: unknown, context: unknown) => Promise<{ statusCode: number; body: string }>;

let handler: Handler;

const STUDYSET_UUID = "11111111-1111-4111-8111-111111111111";
const USER_UUID = "22222222-2222-4222-8222-222222222222";
const OTHER_SET = "99999999-9999-4999-8999-999999999999";
const SRC_SET = "33333333-3333-4333-8333-333333333333";
const DELETES_DEFERRED = "Removed card files left in S3 (deletes deferred):";

beforeAll(() => {
    process.env.mainTable = "test-main";
    process.env.mainBucket = "test-bucket";
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ({ handler } = require("../../service/lambdas/updateStudyset/src/updateStudyset"));
});

const cardWith = (...keys: string[]) => ({
    cardUUID: "c",
    term: "t",
    definition: "d",
    files: keys.map((key) => ({ key, name: "f", size: 1, signedURL: "", association: "term" })),
});

// Items under the caller's PK, by set id.
let items: Record<string, Record<string, unknown> | undefined>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let queryPages: any[];
let updateError: unknown;
// Every DynamoDB and S3 command and every console.log, in order.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let calls: any[];
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let s3Calls: any[];
let logs: unknown[][];

beforeEach(() => {
    logs = [];
    jest.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
        logs.push(args);
        calls.push({ log: args[0] });
    });
    jest.spyOn(console, "warn").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    items = { [STUDYSET_UUID]: { studysetUUID: STUDYSET_UUID, cards: [] } };
    queryPages = [{ Items: [] }];
    updateError = undefined;
    calls = [];
    s3Calls = [];
    jest.spyOn(DynamoDBDocumentClient.prototype, "send").mockImplementation((async (command: unknown) => {
        calls.push(command);
        if (command instanceof GetCommand) {
            const id = String(command.input.Key?.SK).slice("studyset#".length);
            return { Item: items[id] };
        }
        if (command instanceof UpdateCommand) {
            if (updateError) throw updateError;
            return {};
        }
        if (command instanceof QueryCommand) return queryPages.shift() ?? { Items: [] };
        throw new Error("unexpected DynamoDB command");
    }) as never);
    jest.spyOn(S3Client.prototype, "send").mockImplementation((async (command: unknown) => {
        calls.push(command);
        s3Calls.push(command);
        if (command instanceof CopyObjectCommand) return {};
        throw new Error("unexpected S3 command");
    }) as never);
});

afterEach(() => {
    jest.restoreAllMocks();
});

const invoke = (body: Record<string, unknown>) =>
    handler(
        {
            requestContext: { authorizer: { lambda: { sub: USER_UUID, username: "turtles" } } },
            body: JSON.stringify({ studysetUUID: STUDYSET_UUID, ...body }),
        },
        {}
    );

const commands = () => calls.filter((c) => !("log" in c));
const sent = <T>(type: new (...args: never[]) => T): T[] => calls.filter((c) => c instanceof type);
const ownershipGets = () =>
    sent(GetCommand).filter((c) => c.input.ProjectionExpression !== undefined);
const deferredLogs = () => logs.filter(([message]) => message === DELETES_DEFERRED);

describe("updateStudyset handler", () => {
    it("never removes a stored key under another set (repro)", async () => {
        items[STUDYSET_UUID] = { studysetUUID: STUDYSET_UUID, cards: [cardWith(`${OTHER_SET}/f`)] };

        const res = await invoke({ updates: { cards: [] } });

        expect(res.statusCode).toBe(200);
        expect(sent(UpdateCommand)).toHaveLength(1);
        expect(s3Calls).toEqual([]);
        expect(deferredLogs()).toEqual([]);
    });

    it("treats a stub at the set's key as a missing set", async () => {
        items[STUDYSET_UUID] = { cards: [cardWith(`${STUDYSET_UUID}/f`)] };

        const res = await invoke({ updates: { cards: [] } });

        expect(res.statusCode).toBe(404);
        expect(sent(UpdateCommand)).toEqual([]);
        expect(s3Calls).toEqual([]);
    });

    it("logs only the removed keys under the set's prefix and deletes nothing", async () => {
        items[STUDYSET_UUID] = {
            studysetUUID: STUDYSET_UUID,
            cards: [cardWith(`${STUDYSET_UUID}/a`, `${STUDYSET_UUID}/b`, `${OTHER_SET}/g`)],
        };

        const res = await invoke({ updates: { cards: [cardWith(`${STUDYSET_UUID}/b`, `${OTHER_SET}/g`)] } });

        expect(res.statusCode).toBe(200);
        expect(s3Calls).toEqual([]);
        expect(deferredLogs()).toEqual([[DELETES_DEFERRED, [`${STUDYSET_UUID}/a`]]]);
        const logAt = calls.findIndex((c) => c.log === DELETES_DEFERRED);
        expect(logAt).toBeGreaterThan(calls.indexOf(sent(UpdateCommand)[0]));
    });

    it("logs nothing when a save keeps every stored key", async () => {
        items[STUDYSET_UUID] = {
            studysetUUID: STUDYSET_UUID,
            cards: [cardWith(`${STUDYSET_UUID}/a`, `${OTHER_SET}/g`)],
        };

        const res = await invoke({ updates: { cards: [cardWith(`${STUDYSET_UUID}/a`, `${OTHER_SET}/g`)] } });

        expect(res.statusCode).toBe(200);
        expect(s3Calls).toEqual([]);
        expect(deferredLogs()).toEqual([]);
    });

    it("rejects a new key under a set the caller doesn't own", async () => {
        const res = await invoke({ updates: { cards: [cardWith(`${OTHER_SET}/f`)] } });

        expect(res.statusCode).toBe(403);
        expect(sent(UpdateCommand)).toEqual([]);
        expect(s3Calls).toEqual([]);
    });

    it("keeps a foreign key the set already stores without copying it", async () => {
        items[STUDYSET_UUID] = { studysetUUID: STUDYSET_UUID, cards: [cardWith(`${OTHER_SET}/g`)] };

        const res = await invoke({ updates: { cards: [cardWith(`${OTHER_SET}/g`)] } });

        expect(res.statusCode).toBe(200);
        expect(s3Calls).toEqual([]);
        expect(ownershipGets()).toEqual([]);
        expect(sent(UpdateCommand)[0].input.ExpressionAttributeValues?.[":cards"][0].files[0].key).toBe(
            `${OTHER_SET}/g`
        );
    });

    it("copies a key from another set the caller owns into the set (Combine)", async () => {
        items[SRC_SET] = { studysetUUID: SRC_SET };

        const res = await invoke({ updates: { cards: [cardWith(`${SRC_SET}/f`)] } });

        expect(res.statusCode).toBe(200);
        const [copy] = sent(CopyObjectCommand);
        expect(copy.input).toMatchObject({ Bucket: "test-bucket", CopySource: `test-bucket/${SRC_SET}/f` });
        const storedKey = sent(UpdateCommand)[0].input.ExpressionAttributeValues?.[":cards"][0].files[0].key;
        expect(storedKey).toBe(copy.input.Key);
        expect(isOpaqueCardFileKey(storedKey, STUDYSET_UUID)).toBe(true);
        expect(sent(QueryCommand)).toEqual([]);
    });

    it("copies a key one of the caller's other sets already stores (Combine of an old duplicate)", async () => {
        queryPages = [
            { Items: [], LastEvaluatedKey: { PK: "p", SK: "s" } },
            { Items: [{ SK: `studyset#${SRC_SET}`, studysetUUID: SRC_SET, cards: [cardWith(`${OTHER_SET}/f`)] }] },
        ];

        const res = await invoke({ updates: { cards: [cardWith(`${OTHER_SET}/f`)] } });

        expect(res.statusCode).toBe(200);
        expect(sent(CopyObjectCommand)).toHaveLength(1);
        const queries = sent(QueryCommand);
        expect(queries).toHaveLength(2);
        expect(queries[0].input.ExpressionAttributeValues).toEqual({
            ":pk": `userUUID#${USER_UUID}`,
            ":sk": "studyset#",
        });
        expect(queries[1].input.ExclusiveStartKey).toEqual({ PK: "p", SK: "s" });
    });

    it.each([
        ["a stub", { SK: `studyset#${SRC_SET}`, cards: [cardWith(`${OTHER_SET}/f`)] }],
        [
            "the set being saved",
            { SK: `studyset#${STUDYSET_UUID}`, studysetUUID: STUDYSET_UUID, cards: [cardWith(`${OTHER_SET}/f`)] },
        ],
    ])("rejects a foreign key only %s stores", async (_label, item) => {
        queryPages = [{ Items: [item] }];

        const res = await invoke({ updates: { cards: [cardWith(`${OTHER_SET}/f`)] } });

        expect(res.statusCode).toBe(403);
        expect(sent(UpdateCommand)).toEqual([]);
        expect(s3Calls).toEqual([]);
    });

    it("returns 404 for a cards save to a missing set", async () => {
        items[STUDYSET_UUID] = undefined;

        const res = await invoke({ updates: { cards: [] } });

        expect(res.statusCode).toBe(404);
        expect(sent(UpdateCommand)).toEqual([]);
    });

    it("returns 404 when the conditional update finds no set", async () => {
        updateError = Object.assign(new Error("x"), { name: "ConditionalCheckFailedException" });

        const res = await invoke({ updates: { title: "T" } });

        expect(res.statusCode).toBe(404);
    });

    it("only updates an existing item", async () => {
        await invoke({ updates: { title: "T" } });

        const [update] = sent(UpdateCommand);
        expect(update.input.ConditionExpression).toBe("attribute_exists(PK)");
        expectValidExpressionInput(update.input);
    });

    it.each([
        ["files that are not an array", { cards: [{ files: "x" }] }],
        ["a numeric key", { cards: [{ files: [{ key: 42 }] }] }],
    ])("rejects cards with %s", async (_label, updates) => {
        const res = await invoke({ updates });

        expect(res.statusCode).toBe(400);
        expect(sent(UpdateCommand)).toEqual([]);
    });

    it("rejects a non-UUID studysetUUID", async () => {
        const res = await invoke({ studysetUUID: "abc", updates: { title: "T" } });

        expect(res.statusCode).toBe(400);
        expect(commands()).toEqual([]);
    });

    it("rejects missing updates", async () => {
        const res = await invoke({});

        expect(res.statusCode).toBe(400);
        expect(commands()).toEqual([]);
    });

    it("skips file handling on a metadata update", async () => {
        const res = await invoke({ isMetadataUpdate: true, updates: { cards: [cardWith(`${OTHER_SET}/f`)] } });

        expect(res.statusCode).toBe(200);
        expect(s3Calls).toEqual([]);
        // Only the re-read after the update.
        expect(sent(GetCommand)).toHaveLength(1);
        expect(calls.indexOf(sent(GetCommand)[0])).toBeGreaterThan(calls.indexOf(sent(UpdateCommand)[0]));
    });
});
