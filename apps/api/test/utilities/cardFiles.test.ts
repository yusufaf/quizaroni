import { S3Client, CopyObjectCommand } from "@aws-sdk/client-s3";
import type { Card, CardFileMetadata } from "models/studysets";
import {
    planCardFileCopies,
    copyCardFiles,
    isOpaqueCardFileKey,
    isUUID,
    studysetUUIDOfKey,
    isKeyInStudyset,
    collectCardFileKeys,
} from "utilities/cardFiles";

// #126: a duplicate kept the source's file keys, so removing an image from
// the copy deleted the original's S3 object. Copies now get their own objects.

const file = (key: string, extra: Partial<CardFileMetadata> = {}): CardFileMetadata => ({
    key,
    name: key.slice(key.lastIndexOf("/") + 1),
    signedURL: "https://x",
    size: 1,
    association: "term",
    ...extra,
});

const card = (files: CardFileMetadata[]): Card => ({
    cardUUID: "c",
    term: "t",
    definition: "d",
    categories: [],
    important: false,
    notes: [],
    files,
});

const keys = (cards: Card[]) => cards.map((c) => c.files.map((f) => f.key));

// Deterministic stand-in for the random file ids.
const seqKeys = () => {
    let n = 0;
    return () => `NEW/k${++n}`;
};

describe("planCardFileCopies", () => {
    it("gives every file a new key from newFileKey", () => {
        const { cards, copies } = planCardFileCopies([card([file("src/u1/photo.png")])], "NEW", seqKeys());

        expect(keys(cards)).toEqual([["NEW/k1"]]);
        expect(copies).toEqual([{ from: "src/u1/photo.png", to: "NEW/k1" }]);
    });

    // #152: the copy's key used to keep the owner id and the file name.
    it("defaults to an opaque key that names neither the owner nor the file", () => {
        const NEW = "11111111-1111-4111-8111-111111111111";

        const { cards } = planCardFileCopies([card([file("src/u1/photo.png")])], NEW);

        const [[key]] = keys(cards);
        expect(isOpaqueCardFileKey(key, NEW)).toBe(true);
        expect(key).not.toContain("photo");
        expect(key).not.toContain("u1");
    });

    it("keeps name, size, association and other metadata, changing only key", () => {
        const source = file("src/u1/photo.png", {
            size: 42,
            association: "definition",
            uploadedAt: "2026-10-01T00:00:00.000Z",
        });

        const { cards } = planCardFileCopies([card([source])], "NEW", seqKeys());

        expect(cards[0].files[0]).toEqual({ ...source, key: "NEW/k1" });
    });

    it("maps a key shared by two cards to one new key and one copy", () => {
        const shared = "src/u1/photo.png";

        const { cards, copies } = planCardFileCopies([card([file(shared)]), card([file(shared)])], "NEW", seqKeys());

        expect(keys(cards)).toEqual([["NEW/k1"], ["NEW/k1"]]);
        expect(copies).toHaveLength(1);
    });

    it("keeps different source keys with the same file name apart", () => {
        const { cards, copies } = planCardFileCopies([card([file("a/u1/x.png"), file("b/u1/x.png")])], "NEW", seqKeys());

        expect(keys(cards)).toEqual([["NEW/k1", "NEW/k2"]]);
        expect(copies).toEqual([
            { from: "a/u1/x.png", to: "NEW/k1" },
            { from: "b/u1/x.png", to: "NEW/k2" },
        ]);
    });

    it("leaves files without a key alone and plans no copy for them", () => {
        const keyless = file("");

        const { cards, copies } = planCardFileCopies([card([keyless])], "NEW", seqKeys());

        expect(cards[0].files).toEqual([keyless]);
        expect(copies).toEqual([]);
    });

    it("tolerates cards with no files", () => {
        const noFiles = { ...card([]), files: undefined } as unknown as Card;

        const { cards, copies } = planCardFileCopies([noFiles], "NEW", seqKeys());

        expect(cards[0].files).toEqual([]);
        expect(copies).toEqual([]);
    });

    it("does not mutate the input cards", () => {
        const input = [card([file("src/u1/photo.png")]), card([file("src/u1/other.png")])];
        const before = structuredClone(input);

        planCardFileCopies(input, "NEW", seqKeys());

        expect(input).toEqual(before);
    });

    // #188: Combine copies only the keys from other sets, not the set's own.
    it("re-keys only the files shouldRekey picks and plans copies only for them", () => {
        const { cards, copies } = planCardFileCopies(
            [card([file("NEW/own"), file("src/u1/x.png")])],
            "NEW",
            seqKeys(),
            (key) => key.startsWith("src/")
        );

        expect(keys(cards)).toEqual([["NEW/own", "NEW/k1"]]);
        expect(copies).toEqual([{ from: "src/u1/x.png", to: "NEW/k1" }]);
    });
});

describe("copyCardFiles", () => {
    const s3Client = new S3Client({});

    beforeEach(() => {
        jest.spyOn(console, "warn").mockImplementation(() => {});
        jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    // Records each CopyObjectCommand input; `fail` decides which ones reject.
    const fakeS3 = (fail: (input: CopyObjectCommand["input"]) => string | undefined = () => undefined) => {
        const copies: CopyObjectCommand["input"][] = [];
        const send = jest.spyOn(S3Client.prototype, "send").mockImplementation((async (command: unknown) => {
            if (!(command instanceof CopyObjectCommand)) throw new Error("unexpected command");
            copies.push({ ...command.input });
            const name = fail(command.input);
            if (name) throw Object.assign(new Error("x"), { name });
            return {};
        }) as never);
        return { copies, send };
    };

    const run = (cards: Card[]) =>
        copyCardFiles({ s3Client, bucket: "bucket", cards, studysetUUID: "NEW", newFileKey: seqKeys() });

    it("sends one CopyObjectCommand per distinct key with URL-encoded CopySource", async () => {
        const { copies } = fakeS3();
        const key = "src/u1/my photo+1.png";

        const cards = await run([card([file(key)]), card([file(key)])]);

        expect(copies).toEqual([{ Bucket: "bucket", Key: "NEW/k1", CopySource: "bucket/src/u1/my%20photo%2B1.png" }]);
        expect(keys(cards)).toEqual([["NEW/k1"], ["NEW/k1"]]);
    });

    it("does no S3 work when there are no files", async () => {
        const { send } = fakeS3();

        const cards = await run([card([]), card([])]);

        expect(send).not.toHaveBeenCalled();
        expect(keys(cards)).toEqual([[], []]);
    });

    it("drops files whose source object no longer exists", async () => {
        fakeS3((input) => (input.CopySource?.endsWith("a.png") ? "NoSuchKey" : undefined));

        const cards = await run([card([file("src/u1/a.png")]), card([file("src/u1/b.png")])]);

        expect(keys(cards)).toEqual([[], ["NEW/k2"]]);
    });

    it("rejects when a copy fails for another reason", async () => {
        fakeS3(() => "AccessDenied");

        await expect(run([card([file("src/u1/a.png")])])).rejects.toMatchObject({ name: "AccessDenied" });
    });

    it("copies only the keys shouldCopy picks", async () => {
        const { copies } = fakeS3();

        const cards = await copyCardFiles({
            s3Client,
            bucket: "bucket",
            cards: [card([file("NEW/own"), file("src/u1/a.png")])],
            studysetUUID: "NEW",
            newFileKey: seqKeys(),
            shouldCopy: (key) => key === "src/u1/a.png",
        });

        expect(copies.map((c) => c.CopySource)).toEqual(["bucket/src/u1/a.png"]);
        expect(keys(cards)).toEqual([["NEW/own", "NEW/k1"]]);
    });
});

describe("isOpaqueCardFileKey", () => {
    const S = "11111111-1111-4111-8111-111111111111";
    const FILE = "44444444-4444-4444-8444-444444444444";

    it("accepts the set id followed by a file UUID", () => {
        expect(isOpaqueCardFileKey(`${S}/${FILE}`, S)).toBe(true);
    });

    it.each([
        ["a legacy key naming the owner and file", `${S}/22222222-2222-4222-8222-222222222222/photo.png`],
        ["another set's prefix", `99999999-9999-4999-8999-999999999999/${FILE}`],
        ["a file UUID with an extension", `${S}/${FILE}.png`],
        ["an empty key", ""],
        ["a missing key", undefined],
        ["an empty set segment", `/${FILE}`],
        ["a numeric key", 123],
        ["an object key", {}],
    ])("rejects %s", (_label, key) => {
        expect(isOpaqueCardFileKey(key, S)).toBe(false);
    });

    it("rejects any key when the set id is missing", () => {
        expect(isOpaqueCardFileKey(`${S}/${FILE}`, undefined)).toBe(false);
        expect(isOpaqueCardFileKey(`/${FILE}`, "")).toBe(false);
    });
});

describe("studysetUUIDOfKey", () => {
    const S = "11111111-1111-4111-8111-111111111111";
    const FILE = "44444444-4444-4444-8444-444444444444";

    it("returns the set id of an opaque key", () => {
        expect(studysetUUIDOfKey(`${S}/${FILE}`)).toBe(S);
    });

    it("returns the set id of a legacy key", () => {
        expect(studysetUUIDOfKey(`${S}/22222222-2222-4222-8222-222222222222/photo.png`)).toBe(S);
    });

    it.each([
        ["an empty set segment (what cardFileKey('') makes)", `/${S}`],
        ["a non-UUID prefix", "notauuid/x"],
        ["a bare set id", S],
        ["an empty middle segment", `${S}//x`],
        ["a trailing slash", `${S}/`],
        ["a numeric key", 42],
        ["a missing key", undefined],
    ])("returns undefined for %s", (_label, key) => {
        expect(studysetUUIDOfKey(key)).toBeUndefined();
    });
});

describe("isUUID", () => {
    it("accepts a UUID and rejects anything else", () => {
        expect(isUUID("11111111-1111-4111-8111-111111111111")).toBe(true);
        expect(isUUID("")).toBe(false);
        expect(isUUID("abc")).toBe(false);
        expect(isUUID(undefined)).toBe(false);
    });
});

describe("isKeyInStudyset", () => {
    const S = "11111111-1111-4111-8111-111111111111";
    const OTHER = "99999999-9999-4999-8999-999999999999";

    it("is true only for keys under the set's prefix", () => {
        expect(isKeyInStudyset(`${S}/f`, S)).toBe(true);
        expect(isKeyInStudyset(`${OTHER}/f`, S)).toBe(false);
        expect(isKeyInStudyset(`/${S}`, S)).toBe(false);
    });
});

describe("collectCardFileKeys", () => {
    it("collects every non-empty key once", () => {
        const { keys: found, malformed } = collectCardFileKeys([
            card([file("a/1"), file("")]),
            card([file("a/1"), file("b/2")]),
            { ...card([]), files: undefined },
        ]);

        expect([...found]).toEqual(["a/1", "b/2"]);
        expect(malformed).toBe(false);
    });

    it.each([
        ["cards that are not an array", { 0: card([]) }],
        ["a card that is not an object", ["card"]],
        ["files that are not an array", [{ files: "a/1" }]],
        ["a file that is not an object", [{ files: ["a/1"] }]],
        ["a numeric key", [{ files: [{ key: 42 }] }]],
    ])("flags %s as malformed", (_label, cards) => {
        expect(collectCardFileKeys(cards).malformed).toBe(true);
    });
});
