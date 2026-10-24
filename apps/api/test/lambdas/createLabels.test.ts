import { DynamoDBDocumentClient, TransactWriteCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { expectValidExpressionInput } from "../helpers/expressionInput";

// #188: labelling a set the caller doesn't have created a stub item at that
// set's key, which then passed as owning the set's files.

type Handler = (event: unknown, context: unknown) => Promise<{ statusCode: number; body: string }>;

let handler: Handler;

const STUDYSET_UUID = "11111111-1111-4111-8111-111111111111";
const USER_UUID = "22222222-2222-4222-8222-222222222222";

beforeAll(() => {
    process.env.mainTable = "test-main";
    process.env.usersTable = "test-users";
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ({ handler } = require("../../service/lambdas/createLabels/src/createLabels"));
});

// Committed update inputs; a transaction's items commit together or not at all.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let updates: any[];
let transactions: number;
let missingSet: boolean;

beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    updates = [];
    transactions = 0;
    missingSet = false;
    jest.spyOn(DynamoDBDocumentClient.prototype, "send").mockImplementation((async (command: unknown) => {
        if (command instanceof UpdateCommand) {
            updates.push(command.input);
            return {};
        }
        if (command instanceof TransactWriteCommand) {
            transactions++;
            const items = command.input.TransactItems ?? [];
            if (missingSet) {
                throw Object.assign(new Error("x"), {
                    name: "TransactionCanceledException",
                    CancellationReasons: items.map((item) =>
                        item.Update?.TableName === "test-main" ? { Code: "ConditionalCheckFailed" } : { Code: "None" }
                    ),
                });
            }
            updates.push(...items.map((item) => item.Update));
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
            body: JSON.stringify({ label: "bio", ...body }),
        },
        {}
    );

describe("createLabels handler", () => {
    it("labels only an existing set", async () => {
        const res = await invoke({ studysetUUID: STUDYSET_UUID, updateStudysetLabel: true });

        expect(res.statusCode).toBe(200);
        const studysetUpdate = updates.find((u) => u.TableName === "test-main");
        expect(studysetUpdate.ConditionExpression).toBe("attribute_exists(PK)");
        expectValidExpressionInput(studysetUpdate);
        expect(transactions).toBe(1);
        expect(updates.map((u) => u.TableName).sort()).toEqual(["test-main", "test-users"]);
        updates.forEach(expectValidExpressionInput);
    });

    // Either write alone would leave a set label the user's list lacks, or a
    // user label behind a 404 that a retry then duplicates.
    it("returns 404 and writes nothing when the set doesn't exist", async () => {
        missingSet = true;

        const res = await invoke({ studysetUUID: STUDYSET_UUID, updateStudysetLabel: true });

        expect(res.statusCode).toBe(404);
        expect(updates).toEqual([]);
    });

    it("rejects labelling a set without a studysetUUID", async () => {
        const res = await invoke({ updateStudysetLabel: true });

        expect(res.statusCode).toBe(400);
        expect(updates).toEqual([]);
        expect(transactions).toBe(0);
    });

    it("only updates the user's labels when no set is labelled", async () => {
        const res = await invoke({});

        expect(res.statusCode).toBe(200);
        expect(updates.map((u) => u.TableName)).toEqual(["test-users"]);
        expect(transactions).toBe(0);
    });
});
