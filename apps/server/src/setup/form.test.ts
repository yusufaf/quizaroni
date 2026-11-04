import { describe, expect, test } from 'bun:test';
import { type FormValues, readForm, toSetupInput, validateStep } from './form';

const VALID: FormValues = {
    token: 'tok',
    publicUrl: 'https://quiz.example.org',
    registrationMode: 'invite_only',
    teacherPolicy: 'admin_approved',
    name: 'Ada Admin',
    email: 'ada@example.com',
    password: 'correct-horse-1',
    confirmPassword: 'correct-horse-1',
};

function withValues(patch: Partial<FormValues>): FormValues {
    return { ...VALID, ...patch };
}

describe('readForm', () => {
    test('reads string fields and treats files and missing fields as empty', () => {
        const form = readForm({
            token: 'tok',
            name: new File(['x'], 'x.txt'),
            step: 'admin',
            action: 'next',
            lang: 'es',
        });
        expect(form.values.token).toBe('tok');
        expect(form.values.name).toBe('');
        expect(form.values.email).toBe('');
        expect(form).toMatchObject({ step: 'admin', action: 'next', lang: 'es' });
    });
});

describe('validateStep', () => {
    test('accepts a fully valid form on every step', () => {
        for (const step of ['token', 'instance', 'admin'] as const) {
            expect(validateStep(step, VALID)).toEqual({});
        }
    });

    test('token step only requires a value', () => {
        expect(validateStep('token', withValues({ token: '  ' }))).toEqual({
            token: 'errTokenInvalid',
        });
    });

    test.each([
        ['https://quiz.example.org/sub', 'errPublicUrl'],
        ['ftp://quiz.example.org', 'errPublicUrl'],
        ['', 'errPublicUrl'],
    ] as const)('rejects public URL %j', (publicUrl, key) => {
        expect(validateStep('instance', withValues({ publicUrl }))).toEqual({
            publicUrl: key,
        });
    });

    test('accepts a public URL with a trailing slash', () => {
        expect(
            validateStep(
                'instance',
                withValues({ publicUrl: 'https://quiz.example.org/' })
            )
        ).toEqual({});
    });

    test('rejects unknown registration modes and teacher policies', () => {
        expect(
            validateStep(
                'instance',
                withValues({ registrationMode: 'everyone', teacherPolicy: '' })
            )
        ).toEqual({
            registrationMode: 'errRequiredChoice',
            teacherPolicy: 'errRequiredChoice',
        });
    });

    test.each([
        ['   ', false],
        ['A', true],
        ['x'.repeat(100), true],
        ['x'.repeat(101), false],
    ])('name %j valid: %p', (name, ok) => {
        expect(validateStep('admin', withValues({ name }))).toEqual(
            ok ? {} : { name: 'errName' }
        );
    });

    test('rejects an invalid email', () => {
        expect(
            validateStep('admin', withValues({ email: 'admin.@example.com' }))
        ).toEqual({ email: 'errEmail' });
    });

    test.each([
        ['x'.repeat(7), false],
        ['x'.repeat(8), true],
        ['x'.repeat(128), true],
        ['x'.repeat(129), false],
        ['😀'.repeat(64), true],
        ['😀'.repeat(65), false],
    ])('password of length %#: valid %p', (password, ok) => {
        expect(
            validateStep(
                'admin',
                withValues({ password, confirmPassword: password })
            )
        ).toEqual(ok ? {} : { password: 'errPasswordLength' });
    });

    test('rejects a confirmation that does not match', () => {
        expect(
            validateStep(
                'admin',
                withValues({ confirmPassword: 'correct-horse-2' })
            )
        ).toEqual({ confirmPassword: 'errPasswordMismatch' });
    });
});

describe('toSetupInput', () => {
    test('normalises the submitted values', () => {
        expect(
            toSetupInput(
                withValues({
                    name: '  Ada Admin ',
                    email: ' Ada@Example.COM',
                    publicUrl: 'https://quiz.example.org/',
                    registrationMode: 'open',
                    teacherPolicy: 'self_declared',
                }),
                'hash'
            )
        ).toEqual({
            name: 'Ada Admin',
            email: 'ada@example.com',
            passwordHash: 'hash',
            registrationMode: 'open',
            teacherPolicy: 'self_declared',
            publicUrl: 'https://quiz.example.org',
        });
    });
});
