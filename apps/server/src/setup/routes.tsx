/** @jsxImportSource hono/jsx */
import { type Context, Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { html } from 'hono/html';
import type { HtmlEscapedString } from 'hono/utils/html';
import type { ContentfulStatusCode } from 'hono/utils/http-status';
import { isRegistrationMode, isTeacherPolicy } from '../config';
import type { Db } from '../db';
import {
    emptyValues,
    type FieldErrors,
    type FormValues,
    isStep,
    readForm,
    STEPS,
    type Step,
    toSetupInput,
    validateStep,
} from './form';
import { type Locale, type MessageKey, pickLocale } from './messages';
import { completeSetup, describeDbError, type SetupGate } from './setup';
import { AlreadySetUpPage, DonePage, SetupPage } from './views';

export type SetupRouteDeps = {
    db: Db;
    gate: SetupGate;
    configuredPublicUrl: string | undefined;
};

const MAX_BODY_BYTES = 16 * 1024;
const FORM_TYPES = new Set([
    'application/x-www-form-urlencoded',
    'multipart/form-data',
]);

// Hidden fields carry the setup token, so nothing here may be cached, framed
// or leaked through a Referer header.
export function setupHeaders(c: Context): void {
    c.header('Cache-Control', 'no-store');
    c.header('Referrer-Policy', 'no-referrer');
    c.header('X-Frame-Options', 'DENY');
    c.header(
        'Content-Security-Policy',
        "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'; base-uri 'none'"
    );
}

function renderPage(
    c: Context,
    status: ContentfulStatusCode,
    node: HtmlEscapedString | Promise<HtmlEscapedString>
): Response | Promise<Response> {
    setupHeaders(c);
    return c.html(html`<!doctype html>${node}`, status);
}

function withoutPasswords(values: FormValues): FormValues {
    return { ...values, password: '', confirmPassword: '' };
}

export function setupRoutes({
    db,
    gate,
    configuredPublicUrl,
}: SetupRouteDeps): Hono {
    const r = new Hono();

    const instanceDefaults = (
        c: Context
    ): Pick<FormValues, 'publicUrl' | 'registrationMode' | 'teacherPolicy'> => ({
        publicUrl: configuredPublicUrl ?? new URL(c.req.url).origin,
        registrationMode: 'invite_only',
        teacherPolicy: 'admin_approved',
    });

    const page = (
        c: Context,
        status: ContentfulStatusCode,
        locale: Locale,
        step: Step,
        values: FormValues,
        errors: FieldErrors = {},
        formError?: MessageKey
    ) =>
        renderPage(
            c,
            status,
            <SetupPage
                locale={locale}
                step={step}
                values={step === 'admin' ? withoutPasswords(values) : values}
                errors={errors}
                formError={formError}
                publicUrlFromEnv={configuredPublicUrl !== undefined}
            />
        );

    r.get('/', (c) => {
        if (gate.isComplete()) {
            setupHeaders(c);
            return c.redirect('/', 302);
        }
        const locale = pickLocale(
            c.req.query('lang'),
            c.req.header('accept-language')
        );
        return page(c, 200, locale, 'token', emptyValues());
    });

    r.post(
        '/',
        bodyLimit({
            maxSize: MAX_BODY_BYTES,
            onError: (c) => c.text('Payload too large', 413),
        }),
        async (c) => {
            const headerLocale = c.req.header('accept-language');
            if (gate.isComplete()) {
                return renderPage(
                    c,
                    409,
                    <AlreadySetUpPage locale={pickLocale(undefined, headerLocale)} />
                );
            }
            const mediaType = (c.req.header('content-type') ?? '')
                .split(';')[0]!
                .trim()
                .toLowerCase();
            if (!FORM_TYPES.has(mediaType)) {
                setupHeaders(c);
                return c.text('Unsupported media type', 415);
            }

            let body: Awaited<ReturnType<typeof c.req.parseBody>>;
            try {
                body = await c.req.parseBody();
            } catch {
                setupHeaders(c);
                return c.text('Malformed form body', 400);
            }
            const form = readForm(body);
            const locale = pickLocale(form.lang, headerLocale);
            const step: Step = isStep(form.step) ? form.step : 'token';
            const values = form.values;

            if (!gate.checkToken(values.token)) {
                return page(
                    c,
                    403,
                    locale,
                    'token',
                    { ...withoutPasswords(values), token: '' },
                    { token: 'errTokenInvalid' }
                );
            }

            const index = STEPS.indexOf(step);
            if (form.action === 'back') {
                return page(
                    c,
                    200,
                    locale,
                    STEPS[Math.max(index - 1, 0)]!,
                    withoutPasswords(values)
                );
            }

            const errors = validateStep(step, values);
            if (Object.keys(errors).length > 0) {
                return page(c, 400, locale, step, values, errors);
            }

            if (step !== 'admin') {
                const next = STEPS[index + 1]!;
                if (step === 'token') {
                    const defaults = instanceDefaults(c);
                    if (values.publicUrl === '') {
                        values.publicUrl = defaults.publicUrl;
                    }
                    if (!isRegistrationMode(values.registrationMode)) {
                        values.registrationMode = defaults.registrationMode;
                    }
                    if (!isTeacherPolicy(values.teacherPolicy)) {
                        values.teacherPolicy = defaults.teacherPolicy;
                    }
                }
                return page(c, 200, locale, next, values);
            }

            // Earlier steps arrive as hidden fields, so check them again.
            for (const s of ['instance', 'admin'] as const) {
                const stepErrors = validateStep(s, values);
                if (Object.keys(stepErrors).length > 0) {
                    return page(c, 400, locale, s, values, stepErrors);
                }
            }

            const passwordHash = await Bun.password.hash(values.password, {
                algorithm: 'argon2id',
            });
            let result: ReturnType<typeof completeSetup>;
            try {
                result = completeSetup(db, toSetupInput(values, passwordHash));
            } catch (err) {
                // Never pass the error on: its message can hold the hash.
                console.error(`Setup failed: ${describeDbError(err)}`);
                return page(c, 500, locale, 'admin', values, {}, 'errSetupFailed');
            }
            if (result.status === 'already_set_up') {
                gate.markComplete();
                return renderPage(c, 409, <AlreadySetUpPage locale={locale} />);
            }
            gate.markComplete();
            return renderPage(c, 200, <DonePage locale={locale} />);
        }
    );

    return r;
}
