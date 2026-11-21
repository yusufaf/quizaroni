import { routeTargets } from "../helpers/synthApi";

describe("API with readOnly=false", () => {
    let synth: Awaited<ReturnType<typeof routeTargets>>;

    beforeAll(async () => {
        synth = await routeTargets(false);
    }, 60_000);

    it("has no readOnly function", () => {
        expect(synth.functionNames).not.toContain("quizaroni-development-readOnly");
    });

    it("routes writes to their own functions", () => {
        expect(synth.routes.get("POST /api/studysets/update-studyset")).toBe(
            "quizaroni-development-updateStudyset"
        );
        expect(synth.routes.get("POST /api/webhooks/logto-user-created")).toBe(
            "quizaroni-development-logtoUserCreatedWebhook"
        );
    });
});
