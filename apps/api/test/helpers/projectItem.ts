type Item = Record<string, unknown>;

// Mimics DynamoDB: only the projected paths come back, so a projection that
// forgets an attribute the filter needs makes the test fail.
export const project = (item: Item, projection: string, names: Record<string, string> = {}): Item => {
    const out: Item = {};
    for (const rawPath of projection.split(",").map((p) => p.trim())) {
        const segments = rawPath.split(".").map((s) => names[s] ?? s);
        let source: unknown = item;
        for (const segment of segments) {
            source = (source as Item | undefined)?.[segment];
        }
        if (source === undefined) continue;
        let target = out;
        segments.slice(0, -1).forEach((segment) => {
            target[segment] = (target[segment] as Item | undefined) ?? {};
            target = target[segment] as Item;
        });
        target[segments[segments.length - 1]] = source;
    }
    return out;
};
