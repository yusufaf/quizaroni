import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let updates: any[];
let studysetError: unknown;

beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    updates = [];
    studysetError = undefined;
    jest.spyOn(DynamoDBDocumentClient.prototype, "send").mockImplementation((async (command: unknown) => {
        if (!(command instanceof UpdateCommand)) throw new Error("unexpected DynamoDB command");
        if (command.input.TableName === "test-main" && studysetError) throw studysetError;
        updates.push(command.input);
        return {};
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
        expect(updates.map((u) => u.TableName)).toEqual(["test-main", "test-users"]);
    });

    it("returns 404 and adds no user label when the set doesn't exist", async () => {
        studysetError = Object.assign(new Error("x"), { name: "ConditionalCheckFailedException" });

        const res = await invoke({ studysetUUID: STUDYSET_UUID, updateStudysetLabel: true });

        expect(res.statusCode).toBe(404);
        expect(updates).toEqual([]);
    });

    it("only updates the user's labels when no set is labelled", async () => {
        const res = await invoke({});

        expect(res.statusCode).toBe(200);
        expect(updates.map((u) => u.TableName)).toEqual(["test-users"]);
    });
});
