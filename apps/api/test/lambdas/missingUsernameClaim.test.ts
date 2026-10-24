import { S3Client } from "@aws-sdk/client-s3";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { expectValidExpressionInput } from "../helpers/expressionInput";

// Regression test for #180: `username` comes from an optional Logto Custom JWT
// claim. A token without it 500'd every write that put `username` into an
// UpdateExpression: the document client drops the undefined value, and
// DynamoDB then rejects the dangling `:updatedBy`. Every writer now skips
// `updatedBy` when the token has no username. tsc can't flag the inline
// ExpressionAttributeValues sites, so a new writer must be added to `cases`.

jest.mock("@aws-sdk/s3-request-presigner", () => ({
    getSignedUrl: jest.fn().mockResolvedValue("https://signed.example"),
}));

type Fixture = "studyset" | "user";

// The file endpoints and updateStudyset only accept real UUIDs (#188).
const S1 = "11111111-1111-4111-8111-111111111111";

const fixtures: Record<Fixture, Record<string, unknown>> = {
    studyset: {
        PK: "userUUID#u1",
        SK: `studyset#${S1}`,
        studysetUUID: S1,
        cards: [{ cardUUID: "c1", notes: [{ noteUUID: "n1", text: "" }] }],
        labels: ["old"],
        updatedBy: "prev",
    },
    user: { PK: "user#u1", SK: "userData", labels: ["old"], metadata: {} },
};

type Case = {
    name: string;
    body: unknown;
    get?: Fixture;
    query?: Fixture[];
};

const cases: Case[] = [
    { name: "createNote", body: { cardUUID: "c1", studysetUUID: S1 }, get: "studyset" },
    {
        name: "editNote",
        body: { cardUUID: "c1", noteUUID: "n1", studysetUUID: S1, text: "hi" },
        get: "studyset",
    },
    {
        name: "deleteNote",
        body: { cardUUID: "c1", noteUUID: "n1", studysetUUID: S1 },
        get: "studyset",
    },
    {
        name: "createLabels",
        body: { label: "bio", studysetUUID: S1, updateStudysetLabel: true },
    },
    {
        name: "completeMultipartUpload",
        body: {
            key: `${S1}/44444444-4444-4444-8444-444444444444`,
            uploadId: "up",
            parts: [],
            studysetUUID: S1,
            cardUUID: "c1",
            association: "term",
        },
        get: "studyset",
    },
    {
        name: "updateGamification",
        body: {
            gamification: {
                currentStreak: 0,
                longestStreak: 0,
                lastStudyDate: null,
                unlockedAchievementIds: [],
                unlockedAtById: {},
                studiedStudysetUUIDs: [],
                studysetSessionCounts: {},
            },
            customAchievements: [],
        },
        get: "user",
    },
    { name: "updateNotificationPreferences", body: { updates: {} }, get: "user" },
    { name: "updateUserMetadata", body: { updates: { theme: "dark" } }, get: "user" },
    {
        name: "updateStudyset",
        body: { studysetUUID: S1, updates: { title: "t" } },
        get: "studyset",
    },
    {
        name: "editLabels",
        body: { index: 0, oldLabel: "old", newLabel: "new" },
        get: "user",
        query: ["studyset"],
    },
    {
        name: "deleteLabels",
        body: { labelsToDelete: ["old"] },
        get: "user",
        query: ["studyset"],
    },
];

const claims: [string, { sub: string; username?: string | null }][] = [
    ["with username", { sub: "u1", username: "turtles" }],
    ["without username", { sub: "u1" }],
    ["null username", { sub: "u1", username: null }],
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handlers: Record<string, (event: any, context: any) => Promise<{ statusCode: number }>> = {};

beforeAll(() => {
    process.env.mainTable = "test-main";
    process.env.usersTable = "test-users";
    process.env.mainBucket = "test-bucket";
    for (const { name } of cases) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        handlers[name] = require(`lambdas/${name}/src/${name}`).handler;
    }
});

afterEach(() => {
    jest.restoreAllMocks();
});

const run = async (testCase: Case, lambda: unknown) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const commands: any[] = [];
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(S3Client.prototype, "send").mockResolvedValue({ ContentLength: 10 } as never);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    jest.spyOn(DynamoDBDocumentClient.prototype, "send").mockImplementation(async (cmd: any) => {
        commands.push(cmd);
        switch (cmd.constructor.name) {
            case "GetCommand":
                return {
                    Item: testCase.get ? structuredClone(fixtures[testCase.get]) : undefined,
                } as never;
            case "QueryCommand":
                return {
                    Items: (testCase.query ?? []).map((f) => structuredClone(fixtures[f])),
                } as never;
            case "UpdateCommand":
                return { Attributes: { PK: "x", SK: "y", metadata: {} } } as never;
            default:
                return {} as never;
        }
    });

    const res = await handlers[testCase.name](
        { requestContext: { authorizer: { lambda } }, body: JSON.stringify(testCase.body) },
        {}
    );
    return { statusCode: res.statusCode, commands };
};

describe.each(cases)("$name", (testCase) => {
    it.each(claims)("writes cleanly %s (#180)", async (_label, lambda) => {
        const { statusCode, commands } = await run(testCase, lambda);

        expect(statusCode).toBe(200);

        const updateInputs = commands
            .filter((cmd) => cmd.constructor.name === "UpdateCommand")
            .map((cmd) => cmd.input);
        updateInputs.forEach(expectValidExpressionInput);

        const updatedByValues = updateInputs
            .filter((input) => ":updatedBy" in (input.ExpressionAttributeValues ?? {}))
            .map((input) => input.ExpressionAttributeValues[":updatedBy"]);
        const putItems = commands
            .filter((cmd) => cmd.constructor.name === "BatchWriteCommand")
            .flatMap((cmd) => cmd.input.RequestItems["test-main"])
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((request: any) => request.PutRequest.Item);

        if (lambda.username) {
            expect([...updatedByValues, ...putItems.map((item) => item.updatedBy)]).toContain(
                "turtles"
            );
            expect(updatedByValues).not.toContain(undefined);
        } else {
            expect(updatedByValues).toEqual([]);
            for (const item of putItems) {
                expect(item.updatedBy).toBe("prev");
            }
        }
    });
});
