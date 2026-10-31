import { resetManagementTokenCache, updateLogtoUsername } from "utilities/logtoManagement";

const ENDPOINT = "https://auth.example.dev";
const SECRET = "s3cr3t-value";

const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

const tokenResponse = (token = "tok1", expiresIn = 3600) =>
    json(200, { access_token: token, expires_in: expiresIn, token_type: "Bearer", scope: "all" });

const isTokenCall = (url: unknown) => String(url).endsWith("/oidc/token");

let fetchSpy: jest.SpyInstance;

beforeEach(() => {
    process.env.logtoEndpoint = ENDPOINT;
    process.env.logtoM2mAppId = "app1";
    process.env.logtoM2mAppSecret = SECRET;
    process.env.logtoManagementApiResource = "https://default.logto.app/api";
    resetManagementTokenCache();
    fetchSpy = jest.spyOn(global, "fetch");
});

afterEach(() => {
    jest.restoreAllMocks();
});

const mockFetch = (patchResponses: (() => Response)[], tokens: (() => Response)[] = []) => {
    let patchIndex = 0;
    let tokenIndex = 0;
    fetchSpy.mockImplementation(async (url: unknown) => {
        if (isTokenCall(url)) {
            const next = tokens[tokenIndex++];
            return next ? next() : tokenResponse(`tok${tokenIndex}`);
        }
        return patchResponses[patchIndex++]();
    });
};

const calls = () =>
    fetchSpy.mock.calls.map(([url, init]) => ({
        url: String(url),
        init: init as RequestInit & { headers: Record<string, string> },
    }));

describe("updateLogtoUsername", () => {
    it("gets an M2M token, then PATCHes the user's username as JSON", async () => {
        mockFetch([() => json(200, { id: "u1", username: "new_name" })]);

        await expect(updateLogtoUsername({ userId: "u1", username: "new_name" })).resolves.toBe("updated");

        const [token, patch] = calls();
        expect(token.url).toBe(`${ENDPOINT}/oidc/token`);
        expect(token.init.method).toBe("POST");
        expect(token.init.headers.authorization).toBe(
            `Basic ${Buffer.from(`app1:${SECRET}`).toString("base64")}`
        );
        expect(token.init.headers["content-type"]).toBe("application/x-www-form-urlencoded");
        const form = new URLSearchParams(String(token.init.body));
        expect(Object.fromEntries(form)).toEqual({
            grant_type: "client_credentials",
            resource: "https://default.logto.app/api",
            scope: "all",
        });

        expect(patch.url).toBe(`${ENDPOINT}/api/users/u1`);
        expect(patch.init.method).toBe("PATCH");
        expect(patch.init.headers.authorization).toBe("Bearer tok1");
        // Without it Logto parses no body and returns 200 with nothing changed.
        expect(patch.init.headers["content-type"]).toBe("application/json");
        expect(patch.init.body).toBe(JSON.stringify({ username: "new_name" }));
    });

    it("reuses the cached token on a second call", async () => {
        mockFetch([
            () => json(200, { id: "u1", username: "a_name" }),
            () => json(200, { id: "u1", username: "b_name" }),
        ]);

        await updateLogtoUsername({ userId: "u1", username: "a_name" });
        await updateLogtoUsername({ userId: "u1", username: "b_name" });

        expect(calls().filter(({ url }) => isTokenCall(url))).toHaveLength(1);
        expect(calls().filter(({ url }) => !isTokenCall(url))).toHaveLength(2);
    });

    it("refetches the token once it is about to expire", async () => {
        const now = jest.spyOn(Date, "now").mockReturnValue(1_000_000);
        mockFetch([
            () => json(200, { id: "u1", username: "a_name" }),
            () => json(200, { id: "u1", username: "b_name" }),
        ]);

        await updateLogtoUsername({ userId: "u1", username: "a_name" });
        now.mockReturnValue(1_000_000 + 3600_000 - 59_000);
        await updateLogtoUsername({ userId: "u1", username: "b_name" });

        expect(calls().filter(({ url }) => isTokenCall(url))).toHaveLength(2);
        expect(calls()[3].init.headers.authorization).toBe("Bearer tok2");
    });

    it("returns 'taken' when another user has the username", async () => {
        mockFetch([() => json(422, { code: "user.username_already_in_use", message: "taken" })]);

        await expect(updateLogtoUsername({ userId: "u1", username: "new_name" })).resolves.toBe("taken");
    });

    it("throws on a 422 for any other reason", async () => {
        mockFetch([() => json(422, { code: "guard.invalid_input" })]);

        await expect(updateLogtoUsername({ userId: "u1", username: "new_name" })).rejects.toThrow(
            "Logto username update failed: 422 guard.invalid_input"
        );
    });

    it("refetches the token and retries once after a 401", async () => {
        mockFetch([() => json(401, {}), () => json(200, { id: "u1", username: "new_name" })]);

        await expect(updateLogtoUsername({ userId: "u1", username: "new_name" })).resolves.toBe("updated");
        expect(calls().map(({ url }) => isTokenCall(url))).toEqual([true, false, true, false]);
        expect(calls()[3].init.headers.authorization).toBe("Bearer tok2");
    });

    it("throws after a second 401", async () => {
        mockFetch([() => json(401, {}), () => json(401, {})]);

        await expect(updateLogtoUsername({ userId: "u1", username: "new_name" })).rejects.toThrow(
            "Logto username update failed: 401"
        );
        expect(calls()).toHaveLength(4);
    });

    it("throws without leaking the secret when the token request fails", async () => {
        mockFetch([], [() => json(400, { error: "invalid_client" })]);

        const error = await updateLogtoUsername({ userId: "u1", username: "new_name" }).catch((err) => err);

        expect(error).toBeInstanceOf(Error);
        expect(error.message).toBe("Logto token request failed: 400");
        expect(error.message).not.toContain(SECRET);
    });

    it("throws before any request when the M2M app is not configured", async () => {
        process.env.logtoM2mAppSecret = "";
        mockFetch([]);

        await expect(updateLogtoUsername({ userId: "u1", username: "new_name" })).rejects.toThrow(
            "Logto Management API is not configured"
        );
        expect(fetchSpy).not.toHaveBeenCalled();
    });

    it.each([["old_name"], [null]])("throws when a 200 comes back with username %p", async (username) => {
        mockFetch([() => json(200, { id: "u1", username })]);

        await expect(updateLogtoUsername({ userId: "u1", username: "new_name" })).rejects.toThrow(
            "Logto username update did not apply"
        );
    });
});
