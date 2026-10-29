import { PUBLIC_STUDYSET_PK } from "resources/dynamo/publicSharing";
import {
    comparePositions,
    CursorPosition,
    decodeCursor,
    encodeCursor,
    FEATURED_LIMIT,
    FeedEntry,
    FeedSource,
    filterKey,
    matchesQuery,
    paginate,
    parseExploreQuery,
    selectEntries,
    selectFeatured,
    toFeedEntry,
    toSummary,
} from "utilities/exploreFeed";

// #135: the Community feed's pure pieces. The summary is an allowlist like
// toPublicStudyset; the cursor is an opaque keyset tied to the filters.

const uuid = (n: number) => `${String(n).padStart(8, "0")}-1111-4111-8111-111111111111`;
const USER_UUID = "22222222-2222-4222-8222-222222222222";

const storedItem = (overrides: Record<string, unknown> = {}): FeedSource => {
    const studysetUUID = (overrides.studysetUUID as string) ?? uuid(1);
    return {
        PK: `userUUID#${USER_UUID}`,
        SK: `studyset#${studysetUUID}`,
        PK2: PUBLIC_STUDYSET_PK,
        SK2: `studyset#${studysetUUID}`,
        userUUID: USER_UUID,
        studysetUUID,
        username: "turtles",
        title: "Cell biology",
        description: "Organelles and what they do",
        labels: ["Private folder"],
        subject: "science",
        publishedAt: "2026-10-10T00:00:00.000Z",
        updatedAt: "2026-10-15T00:00:00.000Z",
        metadata: { publiclyViewable: true, terminology: "Term" },
        cards: [
            {
                term: "Mitochondria",
                definition: "Powerhouse of the cell",
                notes: [{ noteUUID: "n1", text: "My private note" }],
                files: [
                    {
                        key: "bucket/key.png",
                        association: "term",
                        signedURL: "https://bucket.s3.amazonaws.com/key.png?X-Amz-Signature=abc",
                    },
                ],
            },
        ],
        ...overrides,
    } as FeedSource;
};

const listed = (overrides: Record<string, unknown> = {}) => {
    const entry = toFeedEntry(storedItem(overrides));
    if (!entry) throw new Error("expected a listed entry");
    return entry;
};

const card = (i: number) => ({ term: `Term ${i}`, definition: `Definition ${i}`, files: [] });

describe("toSummary", () => {
    const summarize = (overrides: Record<string, unknown> = {}) =>
        toSummary(storedItem(overrides) as Parameters<typeof toSummary>[0]);

    it("returns exactly the summary fields", () => {
        expect(Object.keys(summarize()).sort()).toEqual(
            [
                "description",
                "previews",
                "publishedAt",
                "studysetUUID",
                "subject",
                "termCount",
                "title",
                "updatedAt",
                "username",
            ].sort()
        );
    });

    it("keeps at most 5 previews of at most 120 characters", () => {
        const long = "x".repeat(300);
        const cards = Array.from({ length: 7 }, (_, i) => ({ ...card(i), definition: long }));
        const summary = summarize({ cards });
        expect(summary.previews).toHaveLength(5);
        expect(summary.termCount).toBe(7);
        for (const preview of summary.previews) {
            expect(Array.from(preview.definition).length).toBeLessThanOrEqual(120);
        }
    });

    it("never carries file data, notes or owner ids", () => {
        const json = JSON.stringify(summarize());
        expect(json).not.toContain("signedURL");
        expect(json).not.toContain('"key"');
        expect(json).not.toContain("files");
        expect(json).not.toContain("My private note");
        expect(json).not.toContain(USER_UUID);
        expect(json).not.toContain("Private folder");
    });

    it("skips image-only term cards in previews", () => {
        const summary = summarize({ cards: [{ term: "", definition: "Only an image", files: [] }, card(1)] });
        expect(summary.previews).toEqual([{ term: "Term 1", definition: "Definition 1" }]);
        expect(summary.termCount).toBe(2);
    });

    it("maps a retired subject to other", () => {
        expect(summarize({ subject: "astrology" }).subject).toBe("other");
    });

    it("maps an empty username to null", () => {
        expect(summarize({ username: "" }).username).toBeNull();
    });

    it("truncates a long description to 200 characters with an ellipsis", () => {
        const description = summarize({ description: "d".repeat(500) }).description;
        expect(Array.from(description)).toHaveLength(200);
        expect(description.endsWith("…")).toBe(true);
    });

    it("tolerates missing cards and updatedAt", () => {
        const summary = summarize({ cards: undefined, updatedAt: undefined });
        expect(summary.previews).toEqual([]);
        expect(summary.termCount).toBe(0);
        expect(summary.updatedAt).toBeNull();
    });
});

describe("toFeedEntry", () => {
    it("keeps the table key server-side next to the summary", () => {
        const entry = listed();
        expect(entry.key).toEqual({ PK: `userUUID#${USER_UUID}`, SK: `studyset#${uuid(1)}` });
        expect(entry.summary.studysetUUID).toBe(uuid(1));
    });

    it.each([
        ["hidden", { moderation: { hiddenAt: "2026-10-16T00:00:00.000Z" } }],
        ["flag off", { metadata: { publiclyViewable: false } }],
        ["a pre-#125 copy", { SK2: `studyset#${uuid(9)}` }],
        ["a legacy share without publishedAt", { publishedAt: undefined }],
    ])("returns null for %s", (_, overrides) => {
        expect(toFeedEntry(storedItem(overrides))).toBeNull();
    });

    // #141: featuredAt stays server-side next to the key, never in the summary.
    it("keeps a featuredAt beside the summary", () => {
        const entry = listed({ featuredAt: "2026-10-20T00:00:00.000Z" });
        expect(entry.featuredAt).toBe("2026-10-20T00:00:00.000Z");
        expect(entry.summary).not.toHaveProperty("featuredAt");
    });

    it.each([
        ["missing", undefined],
        ["empty", ""],
        ["not a string", 1234],
    ])("leaves featuredAt off when it is %s", (_, featuredAt) => {
        expect(listed({ featuredAt })).not.toHaveProperty("featuredAt");
    });

    // #137
    it("keeps searchText server-side", () => {
        const entry = listed();
        expect(entry.searchText).toBe("cell biology organelles and what they do");
        expect(entry.summary).not.toHaveProperty("searchText");
    });

    it("searches description text past what the card shows", () => {
        const entry = listed({ description: `${"a".repeat(300)} zygote` });
        expect(entry.summary.description).not.toContain("zygote");
        expect(selectEntries([entry], { sort: "newest", q: "zygote" })).toEqual([entry]);
    });
});

describe("matchesQuery (#137)", () => {
    it("ignores case", () => {
        expect(matchesQuery("Cell Biology", "cell BIO")).toBe(true);
    });

    it.each([
        ["Verbos en español", "espanol"],
        ["Espanol basico", "Español Básico"],
        ["Niño", "nino"],
        ["CAFÉ", "café"],
    ])("ignores accents on either side: %p / %p", (text, query) => {
        expect(matchesQuery(text, query)).toBe(true);
    });

    it.each([
        ["Cell biology", ""],
        ["Cell biology", "   "],
        ["", ""],
    ])("matches everything for an empty or whitespace-only query: %p / %p", (text, query) => {
        expect(matchesQuery(text, query)).toBe(true);
    });

    it("needs every word, in any order", () => {
        expect(matchesQuery("Spanish verbs", "verbs spanish")).toBe(true);
        expect(matchesQuery("Spanish verbs", "spanish nouns")).toBe(false);
    });

    it("matches inside words", () => {
        expect(matchesQuery("Photosynthesis", "synth")).toBe(true);
    });

    it("ignores punctuation", () => {
        expect(matchesQuery("Cell biology: organelles", "biology, organelles")).toBe(true);
    });
});

describe("cursor", () => {
    const position: CursorPosition = { publishedAt: "2026-10-10T00:00:00.000Z", studysetUUID: uuid(1) };
    const key = filterKey({ sort: "newest" });
    const b64 = (text: string) => Buffer.from(text).toString("base64url");

    it("round-trips", () => {
        expect(decodeCursor(encodeCursor(position, key), key)).toEqual({ ok: true, position });
    });

    it.each([
        ["garbage", "%%%not-a-cursor"],
        ["base64 of non-JSON", b64("hello")],
        ["null", b64("null")],
        ["a number", b64("1")],
        ["a string", b64('"x"')],
        ["an array", b64("[]")],
        ["a wrong version", b64(JSON.stringify({ v: 2, f: key, p: position.publishedAt, u: position.studysetUUID }))],
    ])("rejects %s as malformed", (_, cursor) => {
        expect(decodeCursor(cursor, key)).toEqual({ ok: false, reason: "malformed" });
    });

    it("rejects a cursor made for other filters", () => {
        expect(decodeCursor(encodeCursor(position, "sort=popular"), key)).toEqual({
            ok: false,
            reason: "filterMismatch",
        });
    });

    it("ties the cursor to the subject (#136)", () => {
        const math = filterKey({ sort: "newest", subject: "math" });
        const science = filterKey({ sort: "newest", subject: "science" });
        const mismatch = { ok: false, reason: "filterMismatch" };
        expect(decodeCursor(encodeCursor(position, key), math)).toEqual(mismatch);
        expect(decodeCursor(encodeCursor(position, math), science)).toEqual(mismatch);
        expect(decodeCursor(encodeCursor(position, math), key)).toEqual(mismatch);
        expect(decodeCursor(encodeCursor(position, math), math)).toEqual({ ok: true, position });
    });

    it("ties the cursor to the query (#137)", () => {
        const bio = filterKey({ sort: "newest", q: "bio" });
        const chem = filterKey({ sort: "newest", q: "chem" });
        const mismatch = { ok: false, reason: "filterMismatch" };
        expect(decodeCursor(encodeCursor(position, key), bio)).toEqual(mismatch);
        expect(decodeCursor(encodeCursor(position, bio), chem)).toEqual(mismatch);
        expect(decodeCursor(encodeCursor(position, bio), key)).toEqual(mismatch);
        expect(decodeCursor(encodeCursor(position, bio), bio)).toEqual({ ok: true, position });
    });
});

describe("filterKey", () => {
    it("keeps the no-subject key unchanged, so older cursors stay valid", () => {
        expect(filterKey({ sort: "newest" })).toBe("sort=newest");
    });

    it("appends the subject", () => {
        expect(filterKey({ sort: "newest", subject: "math" })).toBe("sort=newest&subject=math");
    });

    it("appends q after the subject (#137)", () => {
        expect(filterKey({ sort: "newest", subject: "math", q: "cell bio" })).toBe(
            "sort=newest&subject=math&q=cell%20bio"
        );
    });
});

describe("selectEntries", () => {
    const entries = [
        listed({ studysetUUID: uuid(1), subject: "math" }),
        listed({ studysetUUID: uuid(2), subject: "science" }),
        listed({ studysetUUID: uuid(3), subject: "math" }),
        listed({ studysetUUID: uuid(4), subject: "astrology" }),
    ];
    const ids = (selected: readonly FeedEntry[]) => selected.map((e) => e.summary.studysetUUID);

    it("returns the same array with no subject", () => {
        expect(selectEntries(entries, { sort: "newest" })).toBe(entries);
    });

    it("keeps only the subject's entries, in order", () => {
        expect(ids(selectEntries(entries, { sort: "newest", subject: "math" }))).toEqual([uuid(1), uuid(3)]);
    });

    it("reads a retired subject as other", () => {
        expect(ids(selectEntries(entries, { sort: "newest", subject: "other" }))).toEqual([uuid(4)]);
    });

    describe("with a query (#137)", () => {
        const searchable = [
            listed({ studysetUUID: uuid(1), subject: "languages", title: "Verbos en español", description: "" }),
            listed({ studysetUUID: uuid(2), subject: "science", title: "Cells", description: "Spanish names" }),
            listed({ studysetUUID: uuid(3), subject: "science", title: "Atoms", description: "Chemistry" }),
        ];

        it("matches the title", () => {
            expect(ids(selectEntries(searchable, { sort: "newest", q: "verbos" }))).toEqual([uuid(1)]);
        });

        it("matches the description", () => {
            expect(ids(selectEntries(searchable, { sort: "newest", q: "chemistry" }))).toEqual([uuid(3)]);
        });

        it("combines with the subject", () => {
            expect(ids(selectEntries(searchable, { sort: "newest", subject: "science", q: "spanish" }))).toEqual([
                uuid(2),
            ]);
        });
    });
});

describe("selectFeatured", () => {
    const entry = (n: number, featuredAt?: string, publishedAt = "2026-10-10T00:00:00.000Z") =>
        listed({ studysetUUID: uuid(n), publishedAt, ...(featuredAt ? { featuredAt } : {}) });
    const ids = (entries: readonly FeedEntry[]) => entries.map((e) => e.summary.studysetUUID);
    const at = (day: number) => `2026-10-${String(day).padStart(2, "0")}T00:00:00.000Z`;

    it("keeps only featured entries, newest featuredAt first", () => {
        const entries = [entry(1, at(3)), entry(2), entry(3, at(5)), entry(4, at(1))];
        expect(ids(selectFeatured(entries))).toEqual([uuid(3), uuid(1), uuid(4)]);
    });

    it("breaks a featuredAt tie by publishedAt, then uuid", () => {
        const entries = [
            entry(1, at(5), at(1)),
            entry(2, at(5), at(2)),
            entry(3, at(5), at(2)),
        ];
        expect(ids(selectFeatured(entries))).toEqual([uuid(3), uuid(2), uuid(1)]);
    });

    it("caps at FEATURED_LIMIT, or a smaller limit", () => {
        const entries = [1, 2, 3, 4, 5, 6, 7, 8].map((n) => entry(n, at(n)));
        expect(FEATURED_LIMIT).toBe(6);
        expect(ids(selectFeatured(entries))).toEqual([8, 7, 6, 5, 4, 3].map(uuid));
        expect(ids(selectFeatured(entries, 2))).toEqual([uuid(8), uuid(7)]);
    });

    it("does not reorder its input", () => {
        const entries = [entry(1, at(1)), entry(2, at(2))];
        selectFeatured(entries);
        expect(ids(entries)).toEqual([uuid(1), uuid(2)]);
    });

    it("returns an empty list when nothing is featured", () => {
        expect(selectFeatured([entry(1), entry(2)])).toEqual([]);
    });
});

describe("paginate", () => {
    const entry = (n: number, publishedAt: string): FeedEntry => listed({ studysetUUID: uuid(n), publishedAt });
    const sorted = (entries: FeedEntry[]) =>
        [...entries].sort((a, b) => comparePositions(a.summary, b.summary));
    const ids = (entries: FeedEntry[]) => entries.map((e) => e.summary.studysetUUID);

    const five = sorted([
        entry(1, "2026-10-01T00:00:00.000Z"),
        entry(2, "2026-10-02T00:00:00.000Z"),
        entry(3, "2026-10-03T00:00:00.000Z"),
        entry(4, "2026-10-04T00:00:00.000Z"),
        entry(5, "2026-10-05T00:00:00.000Z"),
    ]);

    it("walks pages newest first and ends with no next", () => {
        const first = paginate(five, { limit: 2 });
        expect(ids(first.page)).toEqual([uuid(5), uuid(4)]);
        const second = paginate(five, { after: first.next!, limit: 2 });
        expect(ids(second.page)).toEqual([uuid(3), uuid(2)]);
        const third = paginate(five, { after: second.next!, limit: 2 });
        expect(ids(third.page)).toEqual([uuid(1)]);
        expect(third.next).toBeNull();
    });

    it("orders ties on publishedAt by uuid without skipping or repeating", () => {
        const same = "2026-10-01T00:00:00.000Z";
        const tied = sorted([entry(1, same), entry(2, same), entry(3, same)]);
        expect(ids(tied)).toEqual([uuid(3), uuid(2), uuid(1)]);
        const first = paginate(tied, { limit: 2 });
        const second = paginate(tied, { after: first.next!, limit: 2 });
        expect([...ids(first.page), ...ids(second.page)]).toEqual([uuid(3), uuid(2), uuid(1)]);
    });

    it("continues after a cursor whose entry has left the list", () => {
        const first = paginate(five, { limit: 2 });
        const withoutFour = five.filter((e) => e.summary.studysetUUID !== uuid(4));
        expect(ids(paginate(withoutFour, { after: first.next!, limit: 2 }).page)).toEqual([uuid(3), uuid(2)]);
    });

    it("returns an empty last page for a cursor older than every entry", () => {
        const after = { publishedAt: "2020-01-01T00:00:00.000Z", studysetUUID: uuid(0) };
        expect(paginate(five, { after, limit: 2 })).toEqual({ page: [], next: null });
    });
});

describe("parseExploreQuery", () => {
    it("defaults to newest, 24, no cursor", () => {
        expect(parseExploreQuery(undefined)).toEqual({ ok: true, filters: { sort: "newest" }, limit: 24 });
        expect(parseExploreQuery({ cursor: "" })).toEqual({ ok: true, filters: { sort: "newest" }, limit: 24 });
    });

    it("clamps limit to 48 and passes the cursor through", () => {
        expect(parseExploreQuery({ limit: "100", cursor: "abc" })).toEqual({
            ok: true,
            filters: { sort: "newest" },
            limit: 48,
            cursor: "abc",
        });
    });

    it.each([{ limit: "0" }, { limit: "abc" }, { limit: "1.5" }, { sort: "popular" }])("rejects %p", (params) => {
        expect(parseExploreQuery(params).ok).toBe(false);
    });

    it("passes a known subject through, and ignores an empty one", () => {
        expect(parseExploreQuery({ subject: "math" })).toEqual({
            ok: true,
            filters: { sort: "newest", subject: "math" },
            limit: 24,
        });
        expect(parseExploreQuery({ subject: "" })).toEqual({ ok: true, filters: { sort: "newest" }, limit: 24 });
    });

    // #141
    it("reads featured=1 as the featured row, capped at 6", () => {
        expect(parseExploreQuery({ featured: "1" })).toEqual({ ok: true, featured: true, limit: 6 });
        expect(parseExploreQuery({ featured: "1", limit: "3" })).toEqual({ ok: true, featured: true, limit: 3 });
        expect(parseExploreQuery({ featured: "1", limit: "100" })).toEqual({ ok: true, featured: true, limit: 6 });
    });

    it("ignores an empty featured", () => {
        expect(parseExploreQuery({ featured: "" })).toEqual({ ok: true, filters: { sort: "newest" }, limit: 24 });
    });

    it.each(["0", "yes", "true"])("rejects featured=%p", (featured) => {
        expect(parseExploreQuery({ featured })).toEqual({ ok: false, message: "Unsupported featured" });
    });

    it.each([{ subject: "math" }, { cursor: "abc" }, { q: "x" }])("rejects featured with %p", (params) => {
        expect(parseExploreQuery({ featured: "1", ...params })).toEqual({
            ok: false,
            message: "featured does not combine with subject, q or cursor",
        });
    });

    it.each(["", "   ", "?!"])("ignores a q with no words (%p) in featured mode, as elsewhere", (q) => {
        expect(parseExploreQuery({ featured: "1", q })).toEqual({ ok: true, featured: true, limit: 6 });
    });

    // #137
    it("folds q into the filters", () => {
        expect(parseExploreQuery({ q: "  Español  Básico " })).toEqual({
            ok: true,
            filters: { sort: "newest", q: "espanol basico" },
            limit: 24,
        });
    });

    it.each(["", "   ", "?!"])("leaves a q with no words (%p) out of the filters", (q) => {
        expect(parseExploreQuery({ q })).toEqual({ ok: true, filters: { sort: "newest" }, limit: 24 });
    });

    it("accepts a 100-character q and refuses 101 without echoing it", () => {
        expect(parseExploreQuery({ q: "a".repeat(100) }).ok).toBe(true);
        expect(parseExploreQuery({ q: "a".repeat(101) })).toEqual({ ok: false, message: "q is too long" });
    });

    it.each([{ limit: "0" }, { sort: "oldest" }])("still validates %p in featured mode", (params) => {
        expect(parseExploreQuery({ featured: "1", ...params }).ok).toBe(false);
    });

    // API Gateway joins a repeated param with commas, so "math,law" is two subjects.
    it.each(["astrology", "math,law", "Math"])("rejects the subject %p without echoing it", (subject) => {
        expect(parseExploreQuery({ subject })).toEqual({ ok: false, message: "Unsupported subject" });
    });
});
