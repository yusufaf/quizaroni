import { DynamoDBDocumentClient, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import { expectValidExpressionInput, resolveWrites } from "../helpers/expressionInput";

// #203/#185/#184: updateUserMetadata built placeholders from client keys, so a
// key could overwrite the server's updatedAt/updatedBy or build an invalid
// expression, and empty or missing updates 500'd.

type Handler = (event: unknown, context: unknown) => Promise<{ statusCode: number; body: string }>;

let handler: Handler;

beforeAll(() => {
    process.env.usersTable = "test-users";
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    ({ handler } = require("lambdas/updateUserMetadata/src/updateUserMetadata"));
});

afterEach(() => {
    jest.restoreAllMocks();
});

const run = async (
    body: unknown,
    lambda: unknown = { sub: "u1", username: "turtles" },
    rawBody = JSON.stringify(body)
) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updates: any[] = [];
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
    jest.spyOn(DynamoDBDocumentClient.prototype, "send").mockImplementation((async (cmd: unknown) => {
        if (cmd instanceof UpdateCommand) updates.push(cmd.input);
        return { Item: { PK: "user#u1", SK: "userData", metadata: {} } };
    }) as never);

    const res = await handler(
        { requestContext: { authorizer: { lambda } }, body: rawBody },
        {}
    );
    return { statusCode: res.statusCode, updates };
};

describe("updateUserMetadata", () => {
    it("ignores updatedAt/updatedBy in updates (#203, #185)", async () => {
        const forged = "1999-01-01T00:00:00.000Z";

        const { statusCode, updates } = await run({
            updates: { theme: "dark", updatedAt: forged, updatedBy: "evil" },
        });

        expect(statusCode).toBe(200);
        expect(updates).toHaveLength(1);
        expectValidExpressionInput(updates[0]);
        expect(resolveWrites(updates[0])).toEqual({
            updatedAt: expect.any(String),
            updatedBy: "turtles",
            "metadata.theme": "dark",
        });
        expect(resolveWrites(updates[0]).updatedAt).not.toBe(forged);
    });

    it("writes keys with '-', '.' or the name metadata as one metadata attribute (#203, #185)", async () => {
        const { statusCode, updates } = await run({ updates: { "my-field": 1, "a.b": 2, metadata: 3 } });

        expect(statusCode).toBe(200);
        const [input] = updates;
        expectValidExpressionInput(input);
        const metadataClauses = input.UpdateExpression.replace(/^SET /, "")
            .split(", ")
            .filter((clause: string) => clause.startsWith("#metadata."));
        expect(metadataClauses).toHaveLength(3);
        // resolveWrites splits paths on ".", which would make "a.b" ambiguous.
        const written = Object.fromEntries(
            metadataClauses.map((clause: string) => {
                expect(clause).toMatch(/^#metadata\.#key\d+ = :value\d+$/);
                const [path, value] = clause.split(" = ");
                const name = path.slice("#metadata.".length);
                return [input.ExpressionAttributeNames[name], input.ExpressionAttributeValues[value]];
            })
        );
        expect(written).toEqual({ "my-field": 1, "a.b": 2, metadata: 3 });
    });

    it("doesn't send #metadata when updates is empty (#184)", async () => {
        const { statusCode, updates } = await run({ updates: {} });

        expect(statusCode).toBe(200);
        expectValidExpressionInput(updates[0]);
        expect(updates[0].ExpressionAttributeNames).not.toHaveProperty("#metadata");
        expect(resolveWrites(updates[0])).toEqual({
            updatedAt: expect.any(String),
            updatedBy: "turtles",
        });
    });

    it.each([
        ["a null body", null],
        ["a missing updates", {}],
        ["null updates", { updates: null }],
        ["array updates", { updates: [] }],
        ["string updates", { updates: "x" }],
        ["an empty key", { updates: { "": 1 } }],
    ])("returns 400 for %s without writing (#184)", async (_label, body) => {
        const { statusCode, updates } = await run(body);

        expect(statusCode).toBe(400);
        expect(updates).toEqual([]);
    });

    it("returns 400 for a body that isn't JSON", async () => {
        const { statusCode, updates } = await run(undefined, undefined, "{updates:");

        expect(statusCode).toBe(400);
        expect(updates).toEqual([]);
    });
});
