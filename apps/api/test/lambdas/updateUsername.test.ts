import { DynamoDBDocumentClient, GetCommand, QueryCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { updateLogtoUsername } from "utilities/logtoManagement";
import { expectValidExpressionInput, resolveWrites } from "../helpers/expressionInput";

// #45: Change Username was an empty stub. The endpoint renames the user in
// Logto (the source of the token's username claim), then in the users row,
// then on their own study sets.

jest.mock("utilities/logtoManagement", () => ({
    updateLogtoUsername: jest.fn(),
}));

const mockedUpdateLogtoUsername = updateLogtoUsername as jest.MockedFunction<typeof updateLogtoUsername>;

type Handler = (event: unknown, context: unknown) => Promise<{ statusCode: number; body: string }>;

let handler: Handler;

beforeAll(() => {
    process.env.usersTable = "test-users";
    process.env.mainTable = "test-main";
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ({ handler } = require("lambdas/updateUsername/src/updateUsername"));
});

beforeEach(() => {
    mockedUpdateLogtoUsername.mockReset();
    mockedUpdateLogtoUsername.mockResolvedValue("updated");
});

afterEach(() => {
    jest.restoreAllMocks();
});

const STORED_USER = { PK: "user#u1", SK: "userData", email: "a@b.c", username: "new_name", metadata: {} };

const set = (id: string) => ({ SK: `studyset#${id}`, studysetUUID: id });

type QueryPage = { Items: Record<string, unknown>[]; LastEvaluatedKey?: Record<string, unknown> } | Error;

type Options = {
    rawBody?: string;
    getItem?: Record<string, unknown> | undefined;
    userUpdateError?: Error;
    pages?: QueryPage[];
    failSetUpdate?: (SK: string) => boolean;
};

const run = async (body: unknown, options: Options = {}) => {
    const getItem = "getItem" in options ? options.getItem : { PK: "user#u1", metadata: {} };
    const {
        rawBody = JSON.stringify(body),
        userUpdateError,
        pages = [{ Items: [] }],
        failSetUpdate = () => false,
    } = options;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sent: { type: string; input: any }[] = [];
    let pageIndex = 0;
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(DynamoDBDocumentClient.prototype, "send").mockImplementation((async (cmd: unknown) => {
        if (cmd instanceof GetCommand) {
            sent.push({ type: "get", input: cmd.input });
            return getItem ? { Item: getItem } : {};
        }
        if (cmd instanceof QueryCommand) {
            sent.push({ type: "query", input: cmd.input });
            const page = pages[pageIndex++];
            if (page instanceof Error) throw page;
            return page;
        }
        if (cmd instanceof UpdateCommand) {
            const isUserRow = cmd.input.TableName === "test-users";
            sent.push({ type: isUserRow ? "updateUser" : "updateSet", input: cmd.input });
            if (isUserRow) {
                if (userUpdateError) throw userUpdateError;
                return { Attributes: structuredClone(STORED_USER) };
            }
            if (failSetUpdate(String(cmd.input.Key?.SK))) throw new Error("set write failed");
            return {};
        }
        throw new Error("unexpected command");
    }) as never);

    const res = await handler(
        { requestContext: { authorizer: { lambda: { sub: "u1", username: "old_name" } } }, body: rawBody },
        {}
    );
    const types = sent.map(({ type }) => type);
    return { statusCode: res.statusCode, body: JSON.parse(res.body), sent, types };
};

const conditionFailed = () =>
    Object.assign(new Error("The conditional request failed"), { name: "ConditionalCheckFailedException" });

describe("updateUsername", () => {
    it.each([
        ["no username", {}],
        ["a number", { username: 5 }],
        ["an empty string", { username: "" }],
        ["too short", { username: "ab" }],
        ["a leading digit", { username: "1abc" }],
        ["a space", { username: "has space" }],
        ["too long", { username: "a".repeat(33) }],
    ])("rejects %s with 400", async (_, body) => {
        const { statusCode, body: res, sent } = await run(body);

        expect(statusCode).toBe(400);
        expect(res.message).toBe("Invalid username");
        expect(mockedUpdateLogtoUsername).not.toHaveBeenCalled();
        expect(sent).toEqual([]);
    });

    it("rejects a body that isn't JSON with 400", async () => {
        const { statusCode, sent } = await run(undefined, { rawBody: "not json" });

        expect(statusCode).toBe(400);
        expect(mockedUpdateLogtoUsername).not.toHaveBeenCalled();
        expect(sent).toEqual([]);
    });

    it("trims surrounding whitespace", async () => {
        await run({ username: "  new_name " });

        expect(mockedUpdateLogtoUsername).toHaveBeenCalledWith({ userId: "u1", username: "new_name" });
    });

    it("renames the caller from the token, never a body field", async () => {
        const { sent } = await run({ username: "new_name", userId: "other" });

        expect(mockedUpdateLogtoUsername).toHaveBeenCalledWith({ userId: "u1", username: "new_name" });
        expect(sent[0]).toEqual({
            type: "get",
            input: expect.objectContaining({
                TableName: "test-users",
                Key: { PK: "user#u1", SK: "userData" },
                ConsistentRead: true,
            }),
        });
    });

    it("returns 409 and writes nothing when Logto says the name is taken", async () => {
        mockedUpdateLogtoUsername.mockResolvedValue("taken");

        const { statusCode, body, types } = await run({ username: "new_name" });

        expect(statusCode).toBe(409);
        expect(body.message).toBe("Username taken");
        expect(types).toEqual(["get"]);
    });

    it("writes the username to the users row", async () => {
        const { statusCode, body, sent } = await run({ username: "new_name" });

        expect(statusCode).toBe(200);
        const { input } = sent.find(({ type }) => type === "updateUser")!;
        expect(input.Key).toEqual({ PK: "user#u1", SK: "userData" });
        expect(input.ConditionExpression).toContain("attribute_exists(PK)");
        expect(input.ConditionExpression).toContain("attribute_exists(#metadata)");
        expectValidExpressionInput(input);
        expect(resolveWrites(input)).toEqual({
            username: "new_name",
            updatedBy: "new_name",
            updatedAt: expect.any(String),
        });
        expect(body.user).toEqual({ email: "a@b.c", username: "new_name", metadata: {} });
        expect(body.studysetsRenameComplete).toBe(true);
    });

    it.each([
        ["missing", undefined],
        ["a stub without metadata", { PK: "user#u1" }],
    ])("returns 404 without touching Logto when the users row is %s", async (_, getItem) => {
        const { statusCode, body, types } = await run({ username: "new_name" }, { getItem });

        expect(statusCode).toBe(404);
        expect(body.message).toBe("User not found");
        expect(mockedUpdateLogtoUsername).not.toHaveBeenCalled();
        expect(types).toEqual(["get"]);
    });

    it("returns 404 when the users row disappears before the write", async () => {
        const { statusCode, types } = await run({ username: "new_name" }, { userUpdateError: conditionFailed() });

        expect(statusCode).toBe(404);
        expect(types).not.toContain("query");
    });

    it("returns 500 and writes nothing when Logto fails", async () => {
        mockedUpdateLogtoUsername.mockRejectedValue(new Error("Logto username update failed: 500"));

        const { statusCode, body, types } = await run({ username: "new_name" });

        expect(statusCode).toBe(500);
        expect(body.message).toBe("Error updating username");
        expect(types).toEqual(["get"]);
    });

    it("renames every real study set across pages and skips stubs", async () => {
        const { statusCode, body, sent } = await run(
            { username: "new_name" },
            {
                pages: [
                    { Items: [set("s1"), { SK: "studyset#s9" }], LastEvaluatedKey: { PK: "x", SK: "y" } },
                    { Items: [set("s2"), set("s3")] },
                ],
            }
        );

        expect(statusCode).toBe(200);
        const queries = sent.filter(({ type }) => type === "query").map(({ input }) => input);
        expect(queries).toHaveLength(2);
        expect(queries[0]).toEqual(
            expect.objectContaining({
                TableName: "test-main",
                KeyConditionExpression: "#pk = :pk AND begins_with(#sk, :sk)",
                ExpressionAttributeValues: { ":pk": "userUUID#u1", ":sk": "studyset#" },
                ConsistentRead: true,
            })
        );
        expect(queries[0].ExpressionAttributeNames["#sid"]).toBe("studysetUUID");
        expect(queries[0].ProjectionExpression).toContain("#sid");
        expect(Object.values(queries[0].ExpressionAttributeNames)).not.toContain("cards");
        expect(queries[1].ExclusiveStartKey).toEqual({ PK: "x", SK: "y" });

        const setUpdates = sent.filter(({ type }) => type === "updateSet").map(({ input }) => input);
        expect(setUpdates.map(({ Key }) => Key)).toEqual([
            { PK: "userUUID#u1", SK: "studyset#s1" },
            { PK: "userUUID#u1", SK: "studyset#s2" },
            { PK: "userUUID#u1", SK: "studyset#s3" },
        ]);
        for (const input of setUpdates) {
            expect(input.TableName).toBe("test-main");
            expect(input.ConditionExpression).toBe("attribute_exists(PK)");
            expectValidExpressionInput(input);
            expect(resolveWrites(input)).toEqual({ username: "new_name" });
        }
        expect(body).toEqual(
            expect.objectContaining({ studysetsUpdated: 3, studysetsFailed: 0, studysetsRenameComplete: true })
        );
    });

    it("still succeeds when a study set update fails", async () => {
        const { statusCode, body } = await run(
            { username: "new_name" },
            {
                pages: [{ Items: [set("s1"), set("s2")] }],
                failSetUpdate: (SK) => SK === "studyset#s2",
            }
        );

        expect(statusCode).toBe(200);
        expect(body).toEqual(
            expect.objectContaining({ studysetsUpdated: 1, studysetsFailed: 1, studysetsRenameComplete: false })
        );
    });

    it("still succeeds when the study set Query fails", async () => {
        const { statusCode, body } = await run(
            { username: "new_name" },
            { pages: [new Error("query failed")] }
        );

        expect(statusCode).toBe(200);
        expect(body).toEqual(
            expect.objectContaining({ studysetsUpdated: 0, studysetsFailed: 0, studysetsRenameComplete: false })
        );
    });

    it("keeps the counts from earlier pages when a later Query fails", async () => {
        const { statusCode, body, types } = await run(
            { username: "new_name" },
            {
                pages: [
                    { Items: [set("s1"), set("s2")], LastEvaluatedKey: { PK: "x", SK: "y" } },
                    new Error("query failed"),
                ],
            }
        );

        expect(statusCode).toBe(200);
        expect(types).toEqual(["get", "updateUser", "query", "updateSet", "updateSet", "query"]);
        expect(body).toEqual(
            expect.objectContaining({ studysetsUpdated: 2, studysetsFailed: 0, studysetsRenameComplete: false })
        );
    });
});
