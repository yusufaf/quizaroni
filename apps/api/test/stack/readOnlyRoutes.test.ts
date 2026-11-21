import { routeTargets } from "../helpers/synthApi";

const READ_ONLY_FN = "quizaroni-development-readOnly";

const READ_ROUTES: Record<string, string> = {
    "POST /api/studysets/get-studyset": "quizaroni-development-getStudyset",
    "POST /api/studysets/get-all-studysets": "quizaroni-development-getAllStudysets",
    "POST /api/users/get-user": "quizaroni-development-getUser",
    "POST /api/users/download-user-data": "quizaroni-development-downloadUserData",
    "GET /api/public/studyset/{studysetUUID}": "quizaroni-development-getPublicStudyset",
    "GET /api/public/studysets": "quizaroni-development-getPublicStudysets",
    "GET /api/public/explore": "quizaroni-development-getExploreFeed",
};

describe("API with readOnly=true", () => {
    let synth: Awaited<ReturnType<typeof routeTargets>>;

    beforeAll(async () => {
        synth = await routeTargets(true);
    }, 60_000);

    it("sends every write route to the readOnly function", () => {
        expect(synth.routes.size).toBe(34);
        const writes = [...synth.routes].filter(([key]) => !(key in READ_ROUTES));
        expect(writes).toHaveLength(27);
        for (const [key, fn] of writes) {
            expect({ key, fn }).toEqual({ key, fn: READ_ONLY_FN });
        }
    });

    it("keeps the read routes on their own functions", () => {
        for (const [key, fn] of Object.entries(READ_ROUTES)) {
            expect({ key, fn: synth.routes.get(key) }).toEqual({ key, fn });
        }
    });

    it("blocks the Logto webhook", () => {
        expect(synth.routes.get("POST /api/webhooks/logto-user-created")).toBe(READ_ONLY_FN);
    });

    it("still deploys the write functions", () => {
        expect(synth.functionNames).toContain("quizaroni-development-updateStudyset");
    });

    it("gives the readOnly function its own role", () => {
        const fns = Object.values(synth.functions);
        const readOnlyFn = fns.find((fn) => fn.Properties.FunctionName === READ_ONLY_FN);
        const writeFn = fns.find(
            (fn) => fn.Properties.FunctionName === "quizaroni-development-updateStudyset"
        );
        expect(readOnlyFn?.Properties.Role).not.toEqual(writeFn?.Properties.Role);
    });
});
