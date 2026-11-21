import type { APIGatewayProxyStructuredResultV2 } from "aws-lambda";
import { handler } from "lambdas/readOnly/src/readOnly";
import { READ_ONLY_MESSAGE } from "utilities/readOnly";

describe("readOnly handler", () => {
    it("answers 503 with a retry hint and the cutover message", async () => {
        jest.spyOn(console, "log").mockImplementation(() => undefined);
        const res = (await handler(
            { requestContext: { requestId: "r1", routeKey: "POST /api/studysets/update-studyset" } },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            {} as any,
            () => undefined
        )) as APIGatewayProxyStructuredResultV2;

        expect(res.statusCode).toBe(503);
        expect(res.headers).toEqual({ "Content-Type": "application/json", "Retry-After": "600" });
        expect(JSON.parse(res.body as string).message).toBe(READ_ONLY_MESSAGE);
    });
});
