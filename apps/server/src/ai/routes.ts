import { type Context, Hono, type MiddlewareHandler } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { z } from 'zod';
import type { AuthHandle } from '../auth/auth';
import { INVALID_JSON, readJsonBody } from '../http/json-body';
import { noStore, requireSession, type SessionEnv } from '../http/session';
import {
    buildSystemPrompt,
    AI_MODES,
    TEST_MESSAGE,
    TEST_SYSTEM_PROMPT,
} from './prompts';
import {
    AI_PROVIDERS,
    type AiProvider,
    chatRequest,
    MODEL_NAME,
    modelsRequest,
    readChatReply,
    readModels,
    type UpstreamRequest,
} from './providers';
import { AI_RATE_LIMIT, FixedWindowLimiter } from './rate-limit';

// Not `typeof fetch`: Bun's also carries `fetch.preconnect`.
export type UpstreamFetch = (url: URL, init: RequestInit) => Promise<Response>;

export type AiDeps = {
    enabled: boolean;
    fetch?: UpstreamFetch;
    limiter?: FixedWindowLimiter;
};

const BODY_LIMIT_BYTES = 1024 * 1024;
const CHAT_TIMEOUT_MS = 60_000;
const MODELS_TIMEOUT_MS = 15_000;

type BunServerEnv = { timeout?: (req: Request, seconds: number) => void };

// Bun.serve closes a request after 10 idle seconds by default; give this one
// room for the upstream timeout plus a margin. Absent outside Bun.serve.
function allowSlowReply(c: Context<SessionEnv>, timeoutMs: number): void {
    (c.env as BunServerEnv | undefined)?.timeout?.(
        c.req.raw,
        Math.ceil(timeoutMs / 1000) + 5
    );
}

const Provider = z.enum(AI_PROVIDERS);
const ApiKey = z
    .string()
    .min(1)
    .max(512)
    .regex(/^[\x21-\x7E]+$/);

const ChatBody = z.strictObject({
    provider: Provider,
    model: z.string().regex(MODEL_NAME),
    apiKey: ApiKey,
    messages: z
        .array(
            z.strictObject({
                role: z.enum(['user', 'assistant']),
                content: z.string().min(1).max(32_000),
            })
        )
        .min(1)
        .max(50),
    studysetContext: z
        .strictObject({
            title: z.string().max(500),
            description: z.string().max(5_000).nullish(),
            cards: z
                .array(
                    z.strictObject({
                        term: z.string().max(2_000),
                        definition: z.string().max(2_000),
                    })
                )
                .max(50),
        })
        .optional(),
    mode: z.enum(AI_MODES).default('chat'),
    isTest: z.boolean().optional(),
});

const ModelsBody = z.strictObject({ provider: Provider, apiKey: ApiKey });

type UpstreamResult =
    | { ok: true; json: unknown }
    | {
          ok: false;
          status: 502 | 504;
          message: string;
          providerStatus?: number;
      };

// Never logs or returns the key, the prompt, the URL or the provider's body:
// a provider's error text can echo any of them.
async function callProvider(
    provider: AiProvider,
    req: UpstreamRequest,
    timeoutMs: number,
    clientSignal: AbortSignal,
    fetchImpl: UpstreamFetch
): Promise<UpstreamResult> {
    let res: Response;
    try {
        res = await fetchImpl(req.url, {
            ...req.init,
            signal: AbortSignal.any([
                clientSignal,
                AbortSignal.timeout(timeoutMs),
            ]),
        });
    } catch (err) {
        const name = (err as { name?: unknown })?.name;
        const timedOut = name === 'TimeoutError';
        const kind = timedOut
            ? 'timeout'
            : name === 'AbortError'
              ? 'aborted by the client'
              : 'network';
        console.warn(`AI provider request failed: ${provider} ${kind}`);
        return timedOut
            ? { ok: false, status: 504, message: 'The AI provider timed out' }
            : {
                  ok: false,
                  status: 502,
                  message: 'Could not reach the AI provider',
              };
    }
    if (!res.ok) {
        await res.body?.cancel().catch(() => {});
        console.warn(`AI provider request failed: ${provider} ${res.status}`);
        return {
            ok: false,
            status: 502,
            message: 'The AI provider returned an error',
            providerStatus: res.status,
        };
    }
    try {
        return { ok: true, json: await res.json() };
    } catch {
        console.warn(`AI provider request failed: ${provider} unreadable`);
        return {
            ok: false,
            status: 502,
            message: 'Unexpected response from the AI provider',
        };
    }
}

export function aiRoutes(
    deps: { auth: AuthHandle } & AiDeps
): Hono<SessionEnv> {
    const fetchImpl: UpstreamFetch =
        deps.fetch ?? ((url, init) => fetch(url, init));
    const limiter = deps.limiter ?? new FixedWindowLimiter(AI_RATE_LIMIT);
    const routes = new Hono<SessionEnv>();

    const whenEnabled: MiddlewareHandler<SessionEnv> = async (c, next) => {
        if (!deps.enabled) return c.json({ message: 'Not found' }, 404);
        return next();
    };
    const rateLimited: MiddlewareHandler<SessionEnv> = async (c, next) => {
        const taken = limiter.take(c.get('userId'));
        if (!taken.ok) {
            c.header('Retry-After', String(taken.retryAfterSeconds));
            return c.json(
                { message: 'Too many AI requests. Try again shortly.' },
                429
            );
        }
        return next();
    };
    const guarded = [
        whenEnabled,
        requireSession(deps.auth),
        rateLimited,
        bodyLimit({
            maxSize: BODY_LIMIT_BYTES,
            onError: (c) => c.json({ message: 'Payload too large' }, 413),
        }),
    ] as const;

    routes.use('*', noStore());

    routes.get('/status', (c) => c.json({ enabled: deps.enabled }));

    routes.post('/chat', ...guarded, async (c) => {
        const body = await readJsonBody(c);
        const parsed =
            body === INVALID_JSON ? undefined : ChatBody.safeParse(body);
        if (!parsed?.success) {
            return c.json({ message: 'Invalid request' }, 400);
        }
        allowSlowReply(c, CHAT_TIMEOUT_MS);
        const { provider, model, apiKey, isTest, mode } = parsed.data;
        const input = isTest
            ? {
                  model,
                  apiKey,
                  system: TEST_SYSTEM_PROMPT,
                  messages: [{ role: 'user' as const, content: TEST_MESSAGE }],
              }
            : {
                  model,
                  apiKey,
                  system: buildSystemPrompt(
                      mode,
                      parsed.data.studysetContext ?? { title: '', cards: [] }
                  ),
                  messages: parsed.data.messages,
              };
        const result = await callProvider(
            provider,
            chatRequest(provider, input),
            CHAT_TIMEOUT_MS,
            c.req.raw.signal,
            fetchImpl
        );
        if (!result.ok) {
            return c.json(
                {
                    message: result.message,
                    providerStatus: result.providerStatus,
                },
                result.status
            );
        }
        const content = readChatReply(provider, result.json);
        if (content === undefined) {
            console.warn(`AI provider request failed: ${provider} unreadable`);
            return c.json(
                { message: 'Unexpected response from the AI provider' },
                502
            );
        }
        return c.json({ content });
    });

    routes.post('/models', ...guarded, async (c) => {
        const body = await readJsonBody(c);
        const parsed =
            body === INVALID_JSON ? undefined : ModelsBody.safeParse(body);
        if (!parsed?.success) {
            return c.json({ message: 'Invalid request' }, 400);
        }
        allowSlowReply(c, MODELS_TIMEOUT_MS);
        const { provider, apiKey } = parsed.data;
        const result = await callProvider(
            provider,
            modelsRequest(provider, apiKey),
            MODELS_TIMEOUT_MS,
            c.req.raw.signal,
            fetchImpl
        );
        if (!result.ok) {
            return c.json(
                {
                    message: result.message,
                    providerStatus: result.providerStatus,
                },
                result.status
            );
        }
        return c.json({ models: readModels(provider, result.json) });
    });

    return routes;
}
