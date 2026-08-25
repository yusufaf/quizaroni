import { buildUpdateExpression } from "../../service/lambdas/updateStudyset/src/updateStudyset";

// Regression test for a real bug caught in production: CreateSet.tsx's
// saveChanges() spreads a previously-fetched studyset into `updates`, which
// carries the set's existing `updatedAt`/`updatedBy`. Since this function
// always sets those two itself, the old code produced two SET clauses for
// the same #updatedAt/#updatedBy attribute paths — DynamoDB rejects that
// outright, so every save of an existing studyset 500'd.

describe("updateStudyset buildUpdateExpression", () => {
    it("doesn't duplicate #updatedAt/#updatedBy when the caller's updates carry stale copies", () => {
        const { UpdateExpression, ExpressionAttributeNames, ExpressionAttributeValues } =
            buildUpdateExpression({
                updates: {
                    title: "New Title",
                    // Stale values copied from a previously-fetched studyset,
                    // as CreateSet.tsx's saveChanges() sends them.
                    updatedAt: "2020-01-01T00:00:00.000Z",
                    updatedBy: "someone-else",
                },
                isMetadataUpdate: false,
                updatedAt: "2026-08-25T00:00:00.000Z",
                updatedBy: "turtles",
                studysetUUID: "test-uuid",
            });

        const updatedAtOccurrences = (
            UpdateExpression.match(/#updatedAt = :updatedAt/g) ?? []
        ).length;
        const updatedByOccurrences = (
            UpdateExpression.match(/#updatedBy = :updatedBy/g) ?? []
        ).length;

        expect(updatedAtOccurrences).toBe(1);
        expect(updatedByOccurrences).toBe(1);
        // The server-set values win, not the caller's stale copies.
        expect(ExpressionAttributeValues[":updatedAt"]).toBe(
            "2026-08-25T00:00:00.000Z"
        );
        expect(ExpressionAttributeValues[":updatedBy"]).toBe("turtles");
        expect(ExpressionAttributeNames["#title"]).toBe("title");
        expect(ExpressionAttributeValues[":title"]).toBe("New Title");
    });

    it("still updates normally when the caller's updates don't include updatedAt/updatedBy", () => {
        const { UpdateExpression, ExpressionAttributeValues } = buildUpdateExpression({
            updates: { title: "New Title" },
            isMetadataUpdate: false,
            updatedAt: "2026-08-25T00:00:00.000Z",
            updatedBy: "turtles",
            studysetUUID: "test-uuid",
        });

        expect(UpdateExpression).toContain("#updatedAt = :updatedAt");
        expect(UpdateExpression).toContain("#updatedBy = :updatedBy");
        expect(UpdateExpression).toContain("#title = :title");
        expect(ExpressionAttributeValues[":title"]).toBe("New Title");
    });

    it("adds PK2/SK2 when publiclyViewable turns on, removes them when it turns off", () => {
        const madePublic = buildUpdateExpression({
            updates: { publiclyViewable: true },
            isMetadataUpdate: true,
            updatedAt: "2026-08-25T00:00:00.000Z",
            updatedBy: "turtles",
            studysetUUID: "test-uuid",
        });
        expect(madePublic.UpdateExpression).toContain("#PK2 = :PK2");
        expect(madePublic.UpdateExpression).toContain("#SK2 = :SK2");
        expect(madePublic.UpdateExpression).not.toContain("REMOVE");

        const madePrivate = buildUpdateExpression({
            updates: { publiclyViewable: false },
            isMetadataUpdate: true,
            updatedAt: "2026-08-25T00:00:00.000Z",
            updatedBy: "turtles",
            studysetUUID: "test-uuid",
        });
        expect(madePrivate.UpdateExpression).toContain("REMOVE #PK2, #SK2");
    });
});
