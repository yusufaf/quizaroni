import { BatchGetCommand, DynamoDBDocumentClient, QueryCommand } from "@aws-sdk/lib-dynamodb";
import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { encodeCursor } from "utilities/exploreFeed";
import { project } from "../helpers/projectItem";

// #135: the Community feed. Newest public sets from a 60s module cache, with
// every response's page rechecked so a hidden set drops out at once.

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let handler: (event: any, context: any) => Promise<APIGatewayProxyStructuredResultV2>;
let resetExploreCache: () => void;

const spySend = () => jest.spyOn(DynamoDBDocumentClient.prototype, "send");
let send: ReturnType<typeof spySend>;
let warn: jest.SpyInstance;

type Item = Record<string, unknown>;
type Key = { PK: string; SK: string };

const stored = (id: string, publishedAt: string, extra: Item = {}): Item => ({
    PK: `userUUID#u-${id}`,
    SK: `studyset#${id}`,
    PK2: "publicStudyset",
    SK2: `studyset#${id}`,
    studysetUUID: id,
    title: `Set ${id}`,
    description: "",
    subject: "math",
    username: "turtles",
    publishedAt,
    updatedAt: publishedAt,
    metadata: { publiclyViewable: true, terminology: "Term" },
    cards: [{ term: "a", definition: "b", files: [] }],
    ...extra,
});

const day = (n: number) => `2026-10-${String(n).padStart(2, "0")}T00:00:00.000Z`;

// The table as the BatchGet recheck sees it; tests change rows here to
// simulate a takedown between requests.
let table: Map<string, Item>;
const keyOf = (key: Key) => `${key.PK}|${key.SK}`;

// Query pages for the public index; by default one page of the whole table.
let queryPages: () => { Items: Item[]; LastEvaluatedKey?: Item }[];
// Per BatchGet call, which requested keys to report as unprocessed.
let unprocessedFor: (call: number, keys: Key[]) => Key[];
let batchCalls: number;

const mockDynamo = () => {
    let queryPage = 0;
    send.mockImplementation((async (command: QueryCommand | BatchGetCommand) => {
        if (command instanceof QueryCommand) {
            const { ProjectionExpression = "", ExpressionAttributeNames } = command.input;
            const pages = queryPages();
            const page = pages[queryPage % pages.length];
            queryPage += 1;
            return {
                Items: page.Items.map((item) => project(item, ProjectionExpression, ExpressionAttributeNames)),
                LastEvaluatedKey: page.LastEvaluatedKey,
            };
        }
        if (command instanceof BatchGetCommand) {
            batchCalls += 1;
            const [tableName, request] = Object.entries(command.input.RequestItems ?? {})[0];
            const keys = (request.Keys ?? []) as Key[];
            const unprocessed = unprocessedFor(batchCalls, keys);
            const skip = new Set(unprocessed.map(keyOf));
            const rows = keys
                .filter((key) => !skip.has(keyOf(key)))
                .map((key) => table.get(keyOf(key)))
                .filter((row): row is Item => !!row)
                .map((row) => project(row, request.ProjectionExpression ?? "", request.ExpressionAttributeNames));
            return {
                Responses: { [tableName]: rows },
                UnprocessedKeys: unprocessed.length
                    ? { [tableName]: { ...request, Keys: unprocessed } }
                    : {},
            };
        }
        throw new Error("unexpected command");
    }) as never);
};

const seed = (items: Item[]) => {
    table = new Map(items.map((item) => [keyOf(item as Key), item]));
    queryPages = () => [{ Items: [...table.values()] }];
};

const call = async (query: Record<string, string> = {}) => {
    const res = await handler({ queryStringParameters: query }, {});
    return { res, body: JSON.parse(res.body ?? "{}") };
};

const ids = (body: { items: { studysetUUID: string }[] }) => body.items.map((i) => i.studysetUUID);
const queryCount = () => send.mock.calls.filter(([c]) => c instanceof QueryCommand).length;
const batchCount = () => send.mock.calls.filter(([c]) => c instanceof BatchGetCommand).length;

beforeAll(() => {
    process.env.mainTable = "test-main";
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ({ handler, resetExploreCache } = require("../../service/lambdas/getExploreFeed/src/getExploreFeed"));
});

beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    send = spySend();
    resetExploreCache();
    batchCalls = 0;
    unprocessedFor = () => [];
    seed([]);
    mockDynamo();
});

afterEach(() => {
    jest.restoreAllMocks();
});

describe("getExploreFeed handler", () => {
    it("returns listed sets newest first with no-cache and a total", async () => {
        seed([
            stored("a", day(1)),
            stored("c", day(3)),
            stored("b", day(2)),
            stored("hidden", day(4), { moderation: { hiddenAt: day(5) } }),
            stored("flag-off", day(4), { metadata: { publiclyViewable: false } }),
            stored("copy", day(4), { SK2: "studyset#a" }),
            stored("legacy", day(4), { publishedAt: undefined }),
        ]);

        const { res, body } = await call();

        expect(res.statusCode).toBe(200);
        expect(res.headers?.["Cache-Control"]).toBe("no-cache");
        expect(ids(body)).toEqual(["c", "b", "a"]);
        expect(body.total).toBe(3);
        expect(body.nextCursor).toBeNull();
        expect(JSON.stringify(body)).not.toContain("PK");
    });

    it("pages with a cursor and no overlap", async () => {
        seed([1, 2, 3, 4, 5].map((n) => stored(`s${n}`, day(n))));

        const first = await call({ limit: "2" });
        expect(ids(first.body)).toEqual(["s5", "s4"]);
        expect(first.body.nextCursor).toEqual(expect.any(String));

        const second = await call({ limit: "2", cursor: first.body.nextCursor });
        expect(ids(second.body)).toEqual(["s3", "s2"]);
    });

    it.each([
        ["a cursor for other filters", { cursor: encodeCursor({ publishedAt: day(1), studysetUUID: "x" }, "sort=popular") }],
        ["a garbage cursor", { cursor: "%%%" }],
        ["a bad limit", { limit: "abc" }],
        ["an unknown sort", { sort: "popular" }],
    ])("returns 400 for %s", async (_, query) => {
        const { res, body } = await call(query);
        expect(res.statusCode).toBe(400);
        expect(body.message).toEqual(expect.any(String));
        expect(queryCount()).toBe(0);
    });

    it("serves the second request from the cache but rechecks its page", async () => {
        seed([stored("a", day(1))]);
        await call();
        await call();
        expect(queryCount()).toBe(1);
        expect(batchCount()).toBe(2);
    });

    it("drops a set hidden after the cache was filled, on the next response", async () => {
        seed([stored("a", day(1)), stored("b", day(2))]);
        expect(ids((await call()).body)).toEqual(["b", "a"]);

        table.set("userUUID#u-b|studyset#b", stored("b", day(2), { moderation: { hiddenAt: day(3) } }));
        const { body } = await call();

        expect(ids(body)).toEqual(["a"]);
        expect(body.total).toBe(1);
        expect(queryCount()).toBe(1);
    });

    it("refreshes the cache after 60 seconds", async () => {
        seed([stored("a", day(1))]);
        const now = Date.now();
        const clock = jest.spyOn(Date, "now").mockReturnValue(now);
        await call();
        clock.mockReturnValue(now + 61_000);
        await call();
        expect(queryCount()).toBe(2);
    });

    it("stops at the item cap on whole pages, omits total and logs truncation", async () => {
        let n = 0;
        queryPages = () => [
            {
                Items: Array.from({ length: 1500 }, () => {
                    n += 1;
                    return stored(`s${String(n).padStart(5, "0")}`, day(1));
                }),
                LastEvaluatedKey: { PK2: "publicStudyset", SK2: "more" },
            },
        ];
        table = new Map();

        const { res, body } = await call({ limit: "1" });

        expect(res.statusCode).toBe(200);
        expect(queryCount()).toBe(4);
        expect("total" in body).toBe(false);
        const logged = warn.mock.calls.map(([line]) => String(line)).find((line) => line.includes("exploreFeedRefresh"));
        expect(logged).toContain('"truncated":true');
        expect(logged).toContain('"items":6000');
    });

    it("keeps the total when the cap is reached exactly on the last page", async () => {
        const page = (from: number) =>
            Array.from({ length: 2500 }, (_, i) => stored(`s${String(from + i).padStart(5, "0")}`, day(1)));
        const pages = [
            { Items: page(0), LastEvaluatedKey: { PK2: "publicStudyset", SK2: "more" } },
            { Items: page(2500) },
        ];
        queryPages = () => pages;
        table = new Map(pages.flatMap((p) => p.Items).map((item) => [keyOf(item as Key), item]));

        const { body } = await call({ limit: "1" });

        expect(body.total).toBe(5000);
        expect(warn.mock.calls.map(([line]) => String(line)).join("\n")).not.toContain('"truncated":true');
    });

    it("retries unprocessed keys, and drops still-unprocessed ones from the response only", async () => {
        seed([stored("a", day(1)), stored("b", day(2))]);
        const bKey = { PK: "userUUID#u-b", SK: "studyset#b" };

        unprocessedFor = (callNo) => (callNo <= 2 ? [bKey] : []);
        expect(ids((await call()).body)).toEqual(["b", "a"]);
        expect(batchCount()).toBe(3);

        batchCalls = 0;
        unprocessedFor = () => [bKey];
        const throttled = await call();
        expect(ids(throttled.body)).toEqual(["a"]);
        expect(warn).toHaveBeenCalled();

        unprocessedFor = () => [];
        const recovered = await call();
        expect(ids(recovered.body)).toEqual(["b", "a"]);
        expect(recovered.body.total).toBe(2);
    });

    it("returns an empty last page for a cursor past the oldest entry", async () => {
        seed([stored("a", day(2))]);
        const cursor = encodeCursor({ publishedAt: day(1), studysetUUID: "z" }, "sort=newest");
        const { res, body } = await call({ cursor });
        expect(res.statusCode).toBe(200);
        expect(body.items).toEqual([]);
        expect(body.nextCursor).toBeNull();
    });

    it("returns 500 when the index read fails", async () => {
        send.mockRejectedValue(new Error("boom") as never);
        const { res } = await call();
        expect(res.statusCode).toBe(500);
    });
});
