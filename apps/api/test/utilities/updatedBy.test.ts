import { buildUpdatedBy } from "utilities/updatedBy";

describe("buildUpdatedBy", () => {
    it("returns the SET clause and value when the token has a username", () => {
        expect(buildUpdatedBy("turtles")).toEqual({
            clauses: ["updatedBy = :updatedBy"],
            values: { ":updatedBy": "turtles" },
        });
    });

    it.each([undefined, ""])("returns neither for username %p (#180)", (username) => {
        expect(buildUpdatedBy(username)).toEqual({ clauses: [], values: {} });
    });
});
