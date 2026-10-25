import { buildUpdateExpression } from "../../service/lambdas/updateStudyset/src/updateStudyset";
import { expectValidExpressionInput, resolveRemoves, resolveWrites } from "../helpers/expressionInput";

// Regression test for a real bug caught in production: CreateSet.tsx's
// saveChanges() spreads a previously-fetched studyset into `updates`, which
// carries the set's existing `updatedAt`/`updatedBy`. Since this function
// always sets those two itself, the old code produced two SET clauses for
// the same #updatedAt/#updatedBy attribute paths — DynamoDB rejects that
// outright, so every save of an existing studyset 500'd.

const NOW = "2026-08-25T00:00:00.000Z";

// DynamoDB rejects an update whose names or values aren't all referenced.
const expectAllPlaceholdersUsed = ({
    UpdateExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
}: ReturnType<typeof buildUpdateExpression>) => {
    for (const placeholder of [
        ...Object.keys(ExpressionAttributeNames),
        ...Object.keys(ExpressionAttributeValues),
    ]) {
        expect(UpdateExpression).toMatch(new RegExp(`${placeholder}\\b`));
    }
};

describe("updateStudyset buildUpdateExpression", () => {
    it("doesn't duplicate #updatedAt/#updatedBy when the caller's updates carry stale copies", () => {
        const result = buildUpdateExpression({
            updates: {
                title: "New Title",
                // Stale values copied from a previously-fetched studyset,
                // as CreateSet.tsx's saveChanges() sends them.
                updatedAt: "2020-01-01T00:00:00.000Z",
                updatedBy: "someone-else",
            },
            isMetadataUpdate: false,
            updatedAt: NOW,
            updatedBy: "turtles",
        });
        const { UpdateExpression, ExpressionAttributeValues } = result;

        const updatedAtOccurrences = (
            UpdateExpression.match(/#updatedAt = :updatedAt/g) ?? []
        ).length;
        const updatedByOccurrences = (
            UpdateExpression.match(/#updatedBy = :updatedBy/g) ?? []
        ).length;

        expect(updatedAtOccurrences).toBe(1);
        expect(updatedByOccurrences).toBe(1);
        // The server-set values win, not the caller's stale copies.
        expect(ExpressionAttributeValues[":updatedAt"]).toBe(NOW);
        expect(ExpressionAttributeValues[":updatedBy"]).toBe("turtles");
        expect(resolveWrites(result)).toEqual({ updatedAt: NOW, updatedBy: "turtles", title: "New Title" });
        expectAllPlaceholdersUsed(result);
    });

    it("still updates normally when the caller's updates don't include updatedAt/updatedBy", () => {
        const result = buildUpdateExpression({
            updates: { title: "New Title" },
            isMetadataUpdate: false,
            updatedAt: NOW,
            updatedBy: "turtles",
        });

        expect(result.UpdateExpression).toContain("#updatedAt = :updatedAt");
        expect(result.UpdateExpression).toContain("#updatedBy = :updatedBy");
        expect(resolveWrites(result)).toEqual({ updatedAt: NOW, updatedBy: "turtles", title: "New Title" });
        expectAllPlaceholdersUsed(result);
    });

    // #132: publication and moderation are owned by publish/unpublish and the
    // takedown script, so update-studyset can't skip the gate or undo a takedown.
    it("ignores publication and moderation fields", () => {
        const result = buildUpdateExpression({
            updates: {
                title: "T",
                subject: "math",
                publishedAt: "x",
                moderation: null,
                PK2: "x",
                SK2: "y",
            },
            isMetadataUpdate: false,
            updatedAt: NOW,
            updatedBy: "turtles",
        });

        expect(resolveWrites(result)).toEqual({ updatedAt: NOW, updatedBy: "turtles", title: "T" });
        expect(result.UpdateExpression).not.toContain("REMOVE");
        expectAllPlaceholdersUsed(result);
    });

    // #188: a client-written studysetUUID would turn a stub into a set that
    // passes the ownership check.
    it("ignores identity fields", () => {
        const result = buildUpdateExpression({
            updates: {
                title: "T",
                studysetUUID: "99999999-9999-4999-8999-999999999999",
                userUUID: "u",
                createdAt: "2020-01-01T00:00:00.000Z",
                copiedFrom: { studysetUUID: "x" },
            },
            isMetadataUpdate: false,
            updatedAt: NOW,
            updatedBy: "turtles",
        });

        expect(resolveWrites(result)).toEqual({ updatedAt: NOW, updatedBy: "turtles", title: "T" });
        expectValidExpressionInput(result);
    });

    // #141: only the admin script features a set.
    it("ignores featuredAt", () => {
        const result = buildUpdateExpression({
            updates: { title: "T", featuredAt: "2026-10-20T00:00:00.000Z" },
            isMetadataUpdate: false,
            updatedAt: NOW,
            updatedBy: "turtles",
        });

        expect(resolveWrites(result)).toEqual({ updatedAt: NOW, updatedBy: "turtles", title: "T" });
        expectValidExpressionInput(result);
    });

    // #193: username is the author name a public set shows; only server paths write it.
    it("ignores username", () => {
        const result = buildUpdateExpression({
            // CreateSet's full save spreads the fetched set, stored username included.
            updates: { title: "T", description: "D", username: "someone-else" },
            isMetadataUpdate: false,
            updatedAt: NOW,
            updatedBy: "turtles",
        });

        expect(resolveWrites(result)).toEqual({
            updatedAt: NOW,
            updatedBy: "turtles",
            title: "T",
            description: "D",
        });
        expectValidExpressionInput(result);
    });

    // #193: a client key that spells a generated placeholder (#metadataKey0,
    // :metadataValue0) used to redirect another clause, so it could write
    // username or any other server-owned field. The current spellings (#key0,
    // :value0) are covered too.
    it.each([
        [
            "a name placeholder",
            { metadataKey0: "forged", metadata: { username: "x" } },
            { metadataKey0: "forged", "metadata.username": "x" },
        ],
        [
            "a value placeholder",
            { metadata: { textColorVisible: true }, metadataValue0: "clobber" },
            { "metadata.textColorVisible": true, metadataValue0: "clobber" },
        ],
        [
            "the current name placeholder",
            { key0: "forged", metadata: { username: "x" } },
            { key0: "forged", "metadata.username": "x" },
        ],
        [
            "the current value placeholder",
            { metadata: { textColorVisible: true }, value0: "clobber" },
            { "metadata.textColorVisible": true, value0: "clobber" },
        ],
    ])("can't hijack %s with a client key", (_label, updates, expected) => {
        const result = buildUpdateExpression({
            updates,
            isMetadataUpdate: false,
            updatedAt: NOW,
            updatedBy: "turtles",
        });

        expect(resolveWrites(result)).toEqual({ updatedAt: NOW, updatedBy: "turtles", ...expected });
        expectValidExpressionInput(result);
    });

    it.each([
        ["a full save", { "my-field": 1, "a.b": 2 }, false, { "my-field": 1, "a.b": 2 }],
        ["a metadata update", { "x y": 1 }, true, { "metadata.x y": 1 }],
    ])("writes keys that aren't valid placeholder names on %s", (_label, updates, isMetadataUpdate, expected) => {
        const result = buildUpdateExpression({ updates, isMetadataUpdate, updatedAt: NOW, updatedBy: "turtles" });

        expect(resolveWrites(result)).toEqual({ updatedAt: NOW, updatedBy: "turtles", ...expected });
        // resolveWrites joins path segments with ".", so check "a.b" stays one name, not a nested path.
        expect(Object.values(result.ExpressionAttributeNames)).toEqual(
            expect.arrayContaining(Object.keys(updates))
        );
        expectValidExpressionInput(result);
    });

    it("drops publiclyViewable from a metadata update without leaving an unused #metadata", () => {
        const result = buildUpdateExpression({
            updates: { publiclyViewable: true },
            isMetadataUpdate: true,
            updatedAt: NOW,
            updatedBy: "turtles",
        });

        expect(result.UpdateExpression).toBe("SET #updatedAt = :updatedAt, #updatedBy = :updatedBy");
        expect(result.ExpressionAttributeNames).not.toHaveProperty("#metadata");
        expect(result.ExpressionAttributeNames).not.toHaveProperty("#PK2");
        expectAllPlaceholdersUsed(result);
    });

    it("keeps other keys in a metadata update", () => {
        const result = buildUpdateExpression({
            updates: { publiclyViewable: true, textColorVisible: true },
            isMetadataUpdate: true,
            updatedAt: NOW,
            updatedBy: "turtles",
        });

        expect(resolveWrites(result)).toEqual({
            updatedAt: NOW,
            updatedBy: "turtles",
            "metadata.textColorVisible": true,
        });
        expect(result.ExpressionAttributeNames["#metadata"]).toBe("metadata");
        expectAllPlaceholdersUsed(result);
    });

    it("merges a full-save metadata object per key without publiclyViewable", () => {
        // CreateSet's saveChanges() sends the whole fetched set, metadata included.
        const result = buildUpdateExpression({
            updates: { title: "T", metadata: { publiclyViewable: false, textColorVisible: true } },
            isMetadataUpdate: false,
            updatedAt: NOW,
            updatedBy: "turtles",
        });

        expect(resolveWrites(result)).toEqual({
            updatedAt: NOW,
            updatedBy: "turtles",
            title: "T",
            "metadata.textColorVisible": true,
        });
        expect(result.UpdateExpression).not.toContain("#metadata = ");
        expect(Object.values(result.ExpressionAttributeNames)).not.toContain("publiclyViewable");
        expectAllPlaceholdersUsed(result);
    });

    it("writes nothing for a full-save metadata object holding only publiclyViewable", () => {
        const result = buildUpdateExpression({
            updates: { title: "T", metadata: { publiclyViewable: true } },
            isMetadataUpdate: false,
            updatedAt: NOW,
            updatedBy: "turtles",
        });

        expect(result.ExpressionAttributeNames).not.toHaveProperty("#metadata");
        expectAllPlaceholdersUsed(result);
    });

    it.each([
        ["a full save", { updates: { title: "x" }, isMetadataUpdate: false }],
        ["a metadata update", { updates: { terminology: "x" }, isMetadataUpdate: true }],
    ])("skips updatedBy on %s when the token has no username (#180)", (_label, params) => {
        const result = buildUpdateExpression({
            ...params,
            updatedAt: NOW,
            updatedBy: undefined,
        });

        expect(result.UpdateExpression).not.toContain("#updatedBy");
        expect(result.ExpressionAttributeNames).not.toHaveProperty("#updatedBy");
        expect(result.ExpressionAttributeValues).not.toHaveProperty(":updatedBy");
        expectValidExpressionInput(result);
    });

    it("adds the unpublish clauses when asked (#170)", () => {
        const result = buildUpdateExpression({
            updates: { cards: [] },
            isMetadataUpdate: false,
            updatedAt: NOW,
            updatedBy: "turtles",
            unpublish: true,
        });

        expect(resolveWrites(result)["metadata.publiclyViewable"]).toBe(false);
        expect(resolveRemoves(result)).toEqual(["PK2", "SK2", "featuredAt"]);
        expectValidExpressionInput(result);
    });

    it("unpublishes alongside a full-save metadata object (#170)", () => {
        const result = buildUpdateExpression({
            updates: { title: "T", metadata: { textColorVisible: true, publiclyViewable: true } },
            isMetadataUpdate: false,
            updatedAt: NOW,
            updatedBy: "turtles",
            unpublish: true,
        });

        expect(resolveWrites(result)).toEqual({
            updatedAt: NOW,
            updatedBy: "turtles",
            title: "T",
            "metadata.textColorVisible": true,
            "metadata.publiclyViewable": false,
        });
        expectValidExpressionInput(result);
    });

    it("writes no REMOVE by default", () => {
        const result = buildUpdateExpression({
            updates: { title: "T" },
            isMetadataUpdate: false,
            updatedAt: NOW,
            updatedBy: "turtles",
        });

        expect(result.UpdateExpression).not.toContain("REMOVE");
        expect(resolveRemoves(result)).toEqual([]);
    });

    it("drops a non-object metadata value", () => {
        const result = buildUpdateExpression({
            updates: { title: "T", metadata: null },
            isMetadataUpdate: false,
            updatedAt: NOW,
            updatedBy: "turtles",
        });

        expect(result.ExpressionAttributeNames).not.toHaveProperty("#metadata");
        expectAllPlaceholdersUsed(result);
    });
});
