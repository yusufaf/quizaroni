import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

// #226: the username claim is optional. A Logto account without a username
// must still get a set with an explicit `username: null`, not one with the
// attribute (and the response key) silently dropped.

type Handler = (event: unknown, context: unknown) => Promise<{ statusCode: number; body: string }>;

let createStudyset: Handler;

beforeAll(() => {
    process.env.mainTable = "test-main";
    /* eslint-disable @typescript-eslint/no-var-requires */
    ({ handler: createStudyset } = require("../../service/lambdas/createStudyset/src/createStudyset"));
    /* eslint-enable @typescript-eslint/no-var-requires */
});

beforeEach(() => {
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
    jest.restoreAllMocks();
});

// The handler strips the keys from the item after the Put, so clone it.
const capturePuts = () => {
    const puts: Record<string, unknown>[] = [];
    jest.spyOn(DynamoDBDocumentClient.prototype, "send").mockImplementation(async (command: unknown) => {
        if (command instanceof PutCommand) {
            puts.push(structuredClone(command.input.Item as Record<string, unknown>));
        }
        return {};
    });
    return puts;
};

describe("createStudyset", () => {
    it.each([
        ["with username", { sub: "u1", username: "turtles" }, "turtles"],
        ["without username", { sub: "u1" }, null],
        ["null username", { sub: "u1", username: null }, null],
        ["empty username", { sub: "u1", username: "" }, null],
    ])("stores and returns the username %s", async (_label, lambda, expected) => {
        const puts = capturePuts();

        const result = await createStudyset({ requestContext: { authorizer: { lambda } } }, {});

        expect(result.statusCode).toBe(200);
        expect(puts).toHaveLength(1);
        expect(puts[0]).toHaveProperty("username", expected);
        expect(puts[0]).toMatchObject({ PK: "userUUID#u1", userUUID: "u1" });
        expect(JSON.parse(result.body).studyset).toHaveProperty("username", expected);
    });
});
