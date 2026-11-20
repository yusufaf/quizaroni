import { parseReadOnly } from "utilities/readOnly";

describe("parseReadOnly", () => {
    it.each([undefined, "", "false"])("treats %p as off", (value) => {
        expect(parseReadOnly(value)).toBe(false);
    });

    it("treats 'true' as on", () => {
        expect(parseReadOnly("true")).toBe(true);
    });

    // A typo must fail synth rather than deploy a writable API mid-freeze.
    it.each(["yes", "TRUE "])("rejects %p", (value) => {
        expect(() => parseReadOnly(value)).toThrow(`(got "${value}")`);
    });
});
