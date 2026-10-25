type ExpressionInput = {
    UpdateExpression?: string;
    ConditionExpression?: string;
    ExpressionAttributeNames?: Record<string, string>;
    ExpressionAttributeValues?: Record<string, unknown>;
};

const uniqueSorted = (tokens: string[]) => [...new Set(tokens)].sort();

// Mirrors the checks DynamoDB runs before an UpdateItem: every placeholder in
// the expressions has a defined value or name, nothing extra is sent, and the
// names map is never empty. The document client silently drops a top-level
// undefined value, so a dangling `:placeholder` only fails at DynamoDB.
export const expectValidExpressionInput = (input: ExpressionInput): void => {
    const expr = [input.UpdateExpression, input.ConditionExpression]
        .filter(Boolean)
        .join(" ");
    const values = input.ExpressionAttributeValues ?? {};
    const names = input.ExpressionAttributeNames ?? {};

    expect(uniqueSorted(expr.match(/:[A-Za-z0-9_]+/g) ?? [])).toEqual(
        Object.keys(values).sort()
    );
    for (const [key, value] of Object.entries(values)) {
        expect([key, value]).not.toEqual([key, undefined]);
    }

    expect(uniqueSorted(expr.match(/#[A-Za-z0-9_]+/g) ?? [])).toEqual(
        Object.keys(names).sort()
    );
    if (input.ExpressionAttributeNames) {
        expect(Object.keys(input.ExpressionAttributeNames).length).toBeGreaterThan(0);
    }
};

// What a SET update would write: attribute path -> value, e.g.
// { title: "T", "metadata.textColorVisible": true }.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const resolveWrites = (input: ExpressionInput): Record<string, any> => {
    const names = input.ExpressionAttributeNames ?? {};
    const values = input.ExpressionAttributeValues ?? {};
    const clauses = (input.UpdateExpression ?? "")
        .replace(/^SET /, "")
        .split(", ")
        .map((clause) => {
            const [path, value] = clause.split(" = ");
            const segments = path.split(".");
            for (const name of segments) expect(Object.keys(names)).toContain(name);
            expect(Object.keys(values)).toContain(value);
            return [segments.map((name) => names[name]).join("."), values[value]] as const;
        });
    expect(new Set(clauses.map(([path]) => path)).size).toBe(clauses.length);
    return Object.fromEntries(clauses);
};
