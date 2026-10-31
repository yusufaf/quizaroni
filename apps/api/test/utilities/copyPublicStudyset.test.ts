import type { Studyset } from "models/studysets";
import { PUBLIC_STUDYSET_PK } from "resources/dynamo/publicSharing";
import { buildPublicCopy } from "utilities/copyPublicStudyset";
import { defaultStudysetMetadata } from "utilities/defaultMetadata";

// #140: saving someone else's public set copies only what the public page
// shows into the saver's own library.

const SOURCE_UUID = "11111111-1111-4111-8111-111111111111";
const OTHER_SET_UUID = "44444444-4444-4444-8444-444444444444";
const NEW_UUID = "99999999-9999-4999-8999-999999999999";
const USER_UUID = "22222222-2222-4222-8222-222222222222";
const SAVER_UUID = "33333333-3333-4333-8333-333333333333";
const NOW = "2026-10-24T00:00:00.000Z";

const TERM_KEY = `${SOURCE_UUID}/aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa`;
const DEFINITION_KEY = `${SOURCE_UUID}/bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb`;
const SIGNED_URL = "https://bucket.s3.amazonaws.com/source-signed";

const file = (key: unknown, association: string, name = "my-photo.png") => ({
    key,
    name,
    association,
    size: 123,
    signedURL: SIGNED_URL,
    uploadedAt: "2026-10-02T00:00:00.000Z",
});

const publicSource = () =>
    ({
        PK: `userUUID#${USER_UUID}`,
        SK: `studyset#${SOURCE_UUID}`,
        PK2: PUBLIC_STUDYSET_PK,
        SK2: `studyset#${SOURCE_UUID}`,
        PK3: "pk3",
        SK3: "sk3",
        userUUID: USER_UUID,
        studysetUUID: SOURCE_UUID,
        username: "turtles",
        title: "Cell biology",
        description: "Organelles and what they do",
        labels: ["Biology"],
        categories: ["Organelles"],
        favorited: true,
        lastViewed: "2026-10-14T00:00:00.000Z",
        updatedBy: "turtles",
        createdAt: "2026-10-01T00:00:00.000Z",
        updatedAt: "2026-10-15T00:00:00.000Z",
        subject: "science",
        publishedAt: "2026-10-10T00:00:00.000Z",
        featuredAt: "2026-10-11T00:00:00.000Z",
        saveCount: 7,
        metadata: {
            publiclyViewable: true,
            terminology: "Question/Answer",
            customTerminology: "secret-term",
            notesDrawerPosition: "left",
            printConfig: { secret: "p" },
            cards: [{ notes: [{ text: "secret" }] }],
            someClientKey: "x",
        },
        cards: [
            {
                cardUUID: "c1",
                term: "Mitochondria",
                definition: "Powerhouse of the cell",
                notes: [
                    { noteUUID: "n1", text: "First note" },
                    { noteUUID: "n2", text: "Second note" },
                ],
                categories: ["Organelles"],
                important: true,
                backgroundColor: "#ff0000",
                textColor: "#00ff00",
                files: [
                    file(TERM_KEY, "term"),
                    file(DEFINITION_KEY, "definition"),
                    file(`${SOURCE_UUID}/${USER_UUID}/photo.png`, "term"),
                    file(`${OTHER_SET_UUID}/cccccccc-cccc-4ccc-8ccc-cccccccccccc`, "term"),
                    file(`${SOURCE_UUID}/dddddddd-dddd-4ddd-8ddd-dddddddddddd`, "other"),
                    file(undefined, "term"),
                ],
            },
            {
                cardUUID: "c2",
                term: "Ribosome",
                definition: "Makes proteins",
                notes: [{ noteUUID: "n3", text: "Third note" }],
                categories: [],
                important: false,
                files: [],
            },
        ],
    }) as unknown as Studyset;

const saver = { userUUID: SAVER_UUID, username: "reader" };

const copyOf = (source: Studyset = publicSource(), who: { userUUID: string; username?: string } = saver) =>
    buildPublicCopy(source, { newUUID: NEW_UUID, now: NOW, saver: who });

const findUndefined = (value: unknown, path = "copy"): string[] => {
    if (value === undefined) return [path];
    if (Array.isArray(value)) return value.flatMap((item, i) => findUndefined(item, `${path}[${i}]`));
    if (typeof value === "object" && value !== null) {
        return Object.entries(value).flatMap(([key, item]) => findUndefined(item, `${path}.${key}`));
    }
    return [];
};

describe("buildPublicCopy", () => {
    it("puts the copy in the saver's library", () => {
        const copy = copyOf();

        expect(copy.PK).toBe(`userUUID#${SAVER_UUID}`);
        expect(copy.SK).toBe(`studyset#${NEW_UUID}`);
        expect(copy.studysetUUID).toBe(NEW_UUID);
        expect(copy.userUUID).toBe(SAVER_UUID);
        expect(copy.username).toBe("reader");
        expect(copy.createdAt).toBe(NOW);
        expect(copy.updatedAt).toBe(NOW);
        expect(copy.lastViewed).toBe(NOW);
    });

    it("uses a null username when the token has none", () => {
        expect(copyOf(publicSource(), { userUUID: SAVER_UUID }).username).toBeNull();
    });

    it("drops notes and labels", () => {
        const copy = copyOf();

        expect(copy.labels).toEqual([]);
        for (const card of copy.cards) {
            expect(card.notes).toEqual([]);
        }
    });

    it("keeps only what the public page shows", () => {
        const copy = copyOf();

        expect(copy.title).toBe("Cell biology");
        expect(copy.description).toBe("Organelles and what they do");
        expect(copy.categories).toEqual([]);
        expect(copy.cards.map((card) => [card.term, card.definition])).toEqual([
            ["Mitochondria", "Powerhouse of the cell"],
            ["Ribosome", "Makes proteins"],
        ]);
        for (const card of copy.cards) {
            expect(Object.keys(card).sort()).toEqual([
                "cardUUID",
                "categories",
                "definition",
                "files",
                "important",
                "notes",
                "term",
            ]);
            expect(card.categories).toEqual([]);
            expect(card.important).toBe(false);
        }
    });

    it("keeps only opaque in-set term and definition files, without file names", () => {
        const [first, second] = copyOf().cards;

        expect(first.files).toEqual([
            { key: TERM_KEY, association: "term", size: 123, signedURL: "", name: "Term image" },
            { key: DEFINITION_KEY, association: "definition", size: 123, signedURL: "", name: "Definition image" },
        ]);
        expect(second.files).toEqual([]);
    });

    it("records copiedFrom and no author id", () => {
        const copy = copyOf();
        const stored = JSON.stringify(copy);

        expect(copy.copiedFrom).toEqual({ studysetUUID: SOURCE_UUID });
        expect(stored).not.toContain(USER_UUID);
        expect(stored).not.toContain("turtles");
        expect(stored).not.toContain("secret-term");
        expect(stored).not.toContain('"secret"');
        expect(stored).not.toContain(SIGNED_URL);
        expect(stored).not.toContain("my-photo.png");
    });

    it("makes the copy private", () => {
        const source = {
            ...publicSource(),
            moderation: { hiddenAt: "2026-10-16T00:00:00.000Z", reason: "spam" },
        } as unknown as Studyset;
        const copy = copyOf(source);

        expect(copy.metadata.publiclyViewable).toBe(false);
        expect(copy.favorited).toBe(false);
        for (const key of [
            "PK2", "SK2", "PK3", "SK3", "PK4", "SK4", "PK5", "SK5", "PK6", "SK6",
            "subject", "publishedAt", "featuredAt", "saveCount", "moderation", "updatedBy",
        ]) {
            expect(Object.prototype.hasOwnProperty.call(copy, key)).toBe(false);
        }
    });

    it("starts the copy with default settings", () => {
        expect(copyOf().metadata).toEqual(defaultStudysetMetadata());
    });

    it("copies only allowlisted fields", () => {
        expect(Object.keys(copyOf()).sort()).toEqual([
            "PK",
            "SK",
            "cards",
            "categories",
            "copiedFrom",
            "createdAt",
            "description",
            "favorited",
            "labels",
            "lastViewed",
            "metadata",
            "studysetUUID",
            "title",
            "updatedAt",
            "userUUID",
            "username",
        ]);
    });

    it("tolerates an old record", () => {
        const source = publicSource() as unknown as Record<string, unknown>;
        delete source.description;
        delete source.metadata;
        delete (source.cards as Record<string, unknown>[])[1].files;

        const copy = copyOf(source as unknown as Studyset);

        expect(copy.description).toBe("");
        expect(copy.metadata).toEqual(defaultStudysetMetadata());
        expect(copy.cards[1].files).toEqual([]);
        expect(findUndefined(copy)).toEqual([]);
    });

    it("gives every card a new id", () => {
        const ids = copyOf().cards.map((card) => card.cardUUID);

        expect(ids).toHaveLength(2);
        expect(ids).not.toContain("c1");
        expect(ids).not.toContain("c2");
        expect(new Set(ids).size).toBe(2);
    });

    it("does not mutate the source", () => {
        const source = publicSource();
        const before = structuredClone(source);

        const copy = copyOf(source);
        copy.cards[0].files.push({ key: "k2" } as never);
        copy.metadata.terminology = "changed";

        expect(source).toEqual(before);
    });
});
