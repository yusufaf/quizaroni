/** @jsxImportSource hono/jsx */
import type { Child } from 'hono/jsx';
import {
    FIELDS,
    type FieldErrors,
    type FormValues,
    STEP_FIELDS,
    STEPS,
    type Step,
} from './form';
import { type Locale, type MessageKey, messages } from './messages';

const STYLE = `
:root { color-scheme: light dark; --bg: #fff; --fg: #1a1a1a; --muted: #555;
  --border: #8a8a8a; --accent: #1d4ed8; --error: #b91c1c; --focus: #f59e0b; }
@media (prefers-color-scheme: dark) {
  :root { --bg: #121212; --fg: #f2f2f2; --muted: #b5b5b5; --border: #8f8f8f;
    --accent: #93b4ff; --error: #ff8a8a; --focus: #fbbf24; }
}
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--fg);
  font: 1rem/1.5 system-ui, sans-serif; }
main { max-width: 36rem; margin: 0 auto; padding: 1.5rem 1rem 3rem; }
h1 { font-size: 1.6rem; margin: 0 0 1rem; }
h2 { font-size: 1.25rem; margin: 1.5rem 0 1rem; }
ol.steps { display: flex; flex-wrap: wrap; gap: .25rem 1rem; padding: 0;
  margin: 0; list-style: none; color: var(--muted); }
ol.steps li[aria-current] { color: var(--fg); font-weight: 700; }
.field { margin: 0 0 1.25rem; }
label, legend { display: block; font-weight: 600; }
fieldset { border: 0; padding: 0; margin: 0 0 1.25rem; }
.option { display: flex; gap: .5rem; align-items: flex-start; margin: .5rem 0; }
.option label { font-weight: 400; }
.option input { margin-top: .3rem; }
.hint { color: var(--muted); margin: .25rem 0; font-size: .95rem; }
.error { color: var(--error); font-weight: 600; margin: .25rem 0; }
input[type=text], input[type=url], input[type=email], input[type=password] {
  width: 100%; font: inherit; padding: .5rem; color: var(--fg);
  background: var(--bg); border: 2px solid var(--border); border-radius: 4px; }
input[aria-invalid=true] { border-color: var(--error); }
.actions { display: flex; flex-wrap: wrap; gap: .75rem; margin-top: 1.5rem; }
button, .button { font: inherit; padding: .6rem 1.2rem; border-radius: 4px;
  border: 2px solid var(--accent); cursor: pointer; text-decoration: none; }
button[value=next], .button { background: var(--accent); color: var(--bg); }
button[value=back] { background: transparent; color: var(--accent); }
a { color: var(--accent); }
.summary { border: 3px solid var(--error); padding: .75rem 1rem;
  margin: 1rem 0; }
.summary h2 { margin-top: 0; }
:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px; }
nav.language { margin-top: 2rem; }
nav.language ul { display: flex; gap: 1rem; padding: 0; list-style: none; }
`;

const FIELD_IDS: Record<keyof FormValues, string> = {
    token: 'token',
    publicUrl: 'public-url',
    registrationMode: 'registration-mode',
    teacherPolicy: 'teacher-policy',
    name: 'name',
    email: 'email',
    password: 'password',
    confirmPassword: 'confirm-password',
};

const STEP_TITLES: Record<Step, MessageKey> = {
    token: 'stepToken',
    instance: 'stepInstance',
    admin: 'stepAdmin',
};

const LANGUAGE_NAMES: Record<Locale, string> = { en: 'English', es: 'Español' };

type T = (key: MessageKey) => string;

function translator(locale: Locale): T {
    return (key) => messages[locale][key];
}

export function Layout(props: {
    locale: Locale;
    title: string;
    children: Child;
}) {
    return (
        <html lang={props.locale}>
            <head>
                <meta charset="utf-8" />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1"
                />
                <title>{props.title}</title>
                <style>{STYLE}</style>
            </head>
            <body>
                <main>{props.children}</main>
            </body>
        </html>
    );
}

function describedBy(...ids: (string | false)[]): string | undefined {
    const present = ids.filter((id): id is string => Boolean(id));
    return present.length > 0 ? present.join(' ') : undefined;
}

function TextField(props: {
    field: Exclude<keyof FormValues, 'registrationMode' | 'teacherPolicy'>;
    type: 'text' | 'url' | 'email' | 'password';
    label: string;
    hints: string[];
    value: string;
    error: string | undefined;
    autofocus: boolean;
    autocomplete: string;
    spellcheck?: boolean;
}) {
    const id = FIELD_IDS[props.field];
    const hintIds = props.hints.map((_, i) => `${id}-hint${i ? `-${i}` : ''}`);
    const errorId = `${id}-error`;
    return (
        <div class="field">
            <label for={id}>{props.label}</label>
            {props.hints.map((hint, i) => (
                <p class="hint" id={hintIds[i]}>
                    {hint}
                </p>
            ))}
            {props.error && (
                <p class="error" id={errorId}>
                    {props.error}
                </p>
            )}
            <input
                type={props.type}
                id={id}
                name={props.field}
                value={
                    props.type === 'password' || props.value === ''
                        ? undefined
                        : props.value
                }
                required
                autocomplete={props.autocomplete}
                spellcheck={props.spellcheck}
                autofocus={props.autofocus}
                aria-invalid={props.error ? 'true' : undefined}
                aria-describedby={describedBy(
                    ...hintIds,
                    Boolean(props.error) && errorId
                )}
            />
        </div>
    );
}

function RadioGroup(props: {
    field: 'registrationMode' | 'teacherPolicy';
    legend: string;
    options: { value: string; label: string; hint: string }[];
    value: string;
    error: string | undefined;
    autofocus: boolean;
}) {
    const id = FIELD_IDS[props.field];
    const errorId = `${id}-error`;
    return (
        <fieldset>
            <legend>{props.legend}</legend>
            {props.error && (
                <p class="error" id={errorId}>
                    {props.error}
                </p>
            )}
            {props.options.map((option, i) => {
                const optionId = i === 0 ? id : `${id}-${option.value}`;
                return (
                    <div class="option">
                        <input
                            type="radio"
                            id={optionId}
                            name={props.field}
                            value={option.value}
                            checked={props.value === option.value}
                            required
                            autofocus={props.autofocus && i === 0}
                            aria-invalid={props.error ? 'true' : undefined}
                            aria-describedby={describedBy(
                                `${optionId}-hint`,
                                Boolean(props.error) && errorId
                            )}
                        />
                        <div>
                            <label for={optionId}>{option.label}</label>
                            <p class="hint" id={`${optionId}-hint`}>
                                {option.hint}
                            </p>
                        </div>
                    </div>
                );
            })}
        </fieldset>
    );
}

function StepFields(props: {
    step: Step;
    t: T;
    values: FormValues;
    errors: FieldErrors;
    autofocus: boolean;
    publicUrlFromEnv: boolean;
}) {
    const { step, t, values, errors, autofocus } = props;
    const err = (field: keyof FormValues) =>
        errors[field] ? t(errors[field]) : undefined;
    if (step === 'token') {
        return (
            <TextField
                field="token"
                type="text"
                label={t('tokenLabel')}
                hints={[t('tokenHint')]}
                value={values.token}
                error={err('token')}
                autofocus={autofocus}
                autocomplete="off"
                spellcheck={false}
            />
        );
    }
    if (step === 'instance') {
        return (
            <>
                <TextField
                    field="publicUrl"
                    type="url"
                    label={t('publicUrlLabel')}
                    hints={
                        props.publicUrlFromEnv
                            ? [t('publicUrlHint'), t('publicUrlEnvHint')]
                            : [t('publicUrlHint')]
                    }
                    value={values.publicUrl}
                    error={err('publicUrl')}
                    autofocus={autofocus}
                    autocomplete="url"
                />
                <RadioGroup
                    field="registrationMode"
                    legend={t('registrationLegend')}
                    value={values.registrationMode}
                    error={err('registrationMode')}
                    autofocus={false}
                    options={[
                        {
                            value: 'invite_only',
                            label: t('registrationInvite'),
                            hint: t('registrationInviteHint'),
                        },
                        {
                            value: 'open',
                            label: t('registrationOpen'),
                            hint: t('registrationOpenHint'),
                        },
                    ]}
                />
                <RadioGroup
                    field="teacherPolicy"
                    legend={t('teacherLegend')}
                    value={values.teacherPolicy}
                    error={err('teacherPolicy')}
                    autofocus={false}
                    options={[
                        {
                            value: 'admin_approved',
                            label: t('teacherApproved'),
                            hint: t('teacherApprovedHint'),
                        },
                        {
                            value: 'self_declared',
                            label: t('teacherSelf'),
                            hint: t('teacherSelfHint'),
                        },
                    ]}
                />
            </>
        );
    }
    return (
        <>
            <TextField
                field="name"
                type="text"
                label={t('nameLabel')}
                hints={[]}
                value={values.name}
                error={err('name')}
                autofocus={autofocus}
                autocomplete="name"
            />
            <TextField
                field="email"
                type="email"
                label={t('emailLabel')}
                hints={[]}
                value={values.email}
                error={err('email')}
                autofocus={false}
                autocomplete="username"
            />
            <TextField
                field="password"
                type="password"
                label={t('passwordLabel')}
                hints={[t('passwordHint')]}
                value=""
                error={err('password')}
                autofocus={false}
                autocomplete="new-password"
            />
            <TextField
                field="confirmPassword"
                type="password"
                label={t('confirmPasswordLabel')}
                hints={[]}
                value=""
                error={err('confirmPassword')}
                autofocus={false}
                autocomplete="new-password"
            />
        </>
    );
}

const PASSWORD_FIELDS: readonly (keyof FormValues)[] = [
    'password',
    'confirmPassword',
];

export function SetupPage(props: {
    locale: Locale;
    step: Step;
    values: FormValues;
    errors: FieldErrors;
    formError?: MessageKey;
    publicUrlFromEnv: boolean;
}) {
    const { locale, step, values, errors } = props;
    const t = translator(locale);
    const index = STEPS.indexOf(step);
    const fieldErrors = (Object.keys(errors) as (keyof FormValues)[]).filter(
        (field) => STEP_FIELDS[step].includes(field)
    );
    const hasErrors = fieldErrors.length > 0 || props.formError !== undefined;
    const carried = FIELDS.filter(
        (field) =>
            !STEP_FIELDS[step].includes(field) &&
            !PASSWORD_FIELDS.includes(field) &&
            values[field] !== ''
    );
    return (
        <Layout locale={locale} title={t('pageTitle')}>
            <h1>{t('pageTitle')}</h1>
            <nav aria-label={t('stepsNav')}>
                <ol class="steps">
                    {STEPS.map((s) => (
                        <li aria-current={s === step ? 'step' : undefined}>
                            {t(STEP_TITLES[s])}
                        </li>
                    ))}
                </ol>
            </nav>
            {hasErrors && (
                <div
                    class="summary"
                    role="alert"
                    tabindex={-1}
                    autofocus
                    id="error-summary"
                >
                    <h2>{t('errorSummaryTitle')}</h2>
                    <ul>
                        {props.formError && <li>{t(props.formError)}</li>}
                        {fieldErrors.map((field) => (
                            <li>
                                <a href={`#${FIELD_IDS[field]}`}>
                                    {t(errors[field]!)}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            <form method="post" action="/setup">
                <h2>
                    {t('stepOf').replace('{n}', String(index + 1))}:{' '}
                    {t(STEP_TITLES[step])}
                </h2>
                <StepFields
                    step={step}
                    t={t}
                    values={values}
                    errors={errors}
                    autofocus={!hasErrors}
                    publicUrlFromEnv={props.publicUrlFromEnv}
                />
                {carried.map((field) => (
                    <input type="hidden" name={field} value={values[field]} />
                ))}
                <input type="hidden" name="lang" value={locale} />
                <input type="hidden" name="step" value={step} />
                <div class="actions">
                    <button type="submit" name="action" value="next">
                        {step === 'admin' ? t('finish') : t('next')}
                    </button>
                    {index > 0 && (
                        <button
                            type="submit"
                            name="action"
                            value="back"
                            formnovalidate
                        >
                            {t('back')}
                        </button>
                    )}
                </div>
            </form>
            {step === 'token' && (
                <nav class="language" aria-label={t('language')}>
                    <ul>
                        {(Object.keys(LANGUAGE_NAMES) as Locale[]).map((l) => (
                            <li>
                                <a
                                    href={`/setup?lang=${l}`}
                                    lang={l}
                                    aria-current={
                                        l === locale ? 'true' : undefined
                                    }
                                >
                                    {LANGUAGE_NAMES[l]}
                                </a>
                            </li>
                        ))}
                    </ul>
                </nav>
            )}
        </Layout>
    );
}

export function DonePage(props: { locale: Locale }) {
    const t = translator(props.locale);
    return (
        <Layout locale={props.locale} title={t('doneTitle')}>
            <h1>{t('doneTitle')}</h1>
            <p>{t('doneBody')}</p>
            <p>
                <a class="button" href="/">
                    {t('doneLink')}
                </a>
            </p>
        </Layout>
    );
}

export function AlreadySetUpPage(props: { locale: Locale }) {
    const t = translator(props.locale);
    return (
        <Layout locale={props.locale} title={t('alreadyTitle')}>
            <h1>{t('alreadyTitle')}</h1>
            <p>{t('alreadyBody')}</p>
            <p>
                <a href="/">{t('doneLink')}</a>
            </p>
        </Layout>
    );
}
