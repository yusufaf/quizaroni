import {
    isRegistrationMode,
    isTeacherPolicy,
    normalizeEmail,
    normalizePublicUrl,
    passwordLengthOk,
} from '../config';
import type { MessageKey } from './messages';
import type { SetupInput } from './setup';

export const STEPS = ['token', 'instance', 'admin'] as const;
export type Step = (typeof STEPS)[number];

export function isStep(value: string): value is Step {
    return (STEPS as readonly string[]).includes(value);
}

export type FormValues = {
    token: string;
    publicUrl: string;
    registrationMode: string;
    teacherPolicy: string;
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
};

export const FIELDS: readonly (keyof FormValues)[] = [
    'token',
    'publicUrl',
    'registrationMode',
    'teacherPolicy',
    'name',
    'email',
    'password',
    'confirmPassword',
];

export const STEP_FIELDS: Record<Step, readonly (keyof FormValues)[]> = {
    token: ['token'],
    instance: ['publicUrl', 'registrationMode', 'teacherPolicy'],
    admin: ['name', 'email', 'password', 'confirmPassword'],
};

export type FieldErrors = Partial<Record<keyof FormValues, MessageKey>>;

const NAME_MAX = 100;

export function emptyValues(): FormValues {
    return Object.fromEntries(FIELDS.map((f) => [f, ''])) as FormValues;
}

export function readForm(
    body: Record<string, string | File | (string | File)[]>
): {
    values: FormValues;
    step: string;
    action: string;
    lang: string;
} {
    const text = (name: string): string => {
        const value = body[name];
        return typeof value === 'string' ? value : '';
    };
    const values = emptyValues();
    for (const field of FIELDS) values[field] = text(field);
    return {
        values,
        step: text('step'),
        action: text('action'),
        lang: text('lang'),
    };
}

export function validateStep(step: Step, v: FormValues): FieldErrors {
    const errors: FieldErrors = {};
    if (step === 'token') {
        if (v.token.trim() === '') errors.token = 'errTokenInvalid';
    } else if (step === 'instance') {
        if (normalizePublicUrl(v.publicUrl) === undefined) {
            errors.publicUrl = 'errPublicUrl';
        }
        if (!isRegistrationMode(v.registrationMode)) {
            errors.registrationMode = 'errRequiredChoice';
        }
        if (!isTeacherPolicy(v.teacherPolicy)) {
            errors.teacherPolicy = 'errRequiredChoice';
        }
    } else {
        const name = v.name.trim();
        if (name === '' || [...name].length > NAME_MAX) {
            errors.name = 'errName';
        }
        if (normalizeEmail(v.email) === undefined) errors.email = 'errEmail';
        if (!passwordLengthOk(v.password)) {
            errors.password = 'errPasswordLength';
        } else if (v.confirmPassword !== v.password) {
            errors.confirmPassword = 'errPasswordMismatch';
        }
    }
    return errors;
}

// Call only after validateStep passed for the instance and admin steps.
export function toSetupInput(v: FormValues, passwordHash: string): SetupInput {
    if (
        !isRegistrationMode(v.registrationMode) ||
        !isTeacherPolicy(v.teacherPolicy)
    ) {
        throw new Error('toSetupInput called with unvalidated values');
    }
    return {
        name: v.name.trim(),
        email: normalizeEmail(v.email)!,
        passwordHash,
        registrationMode: v.registrationMode,
        teacherPolicy: v.teacherPolicy,
        publicUrl: normalizePublicUrl(v.publicUrl),
    };
}
