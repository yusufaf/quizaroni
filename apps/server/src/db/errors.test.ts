import { describe, expect, test } from 'bun:test';
import { isUniqueViolation } from './errors';

function withCode(code: string, cause?: unknown): Error {
    return Object.assign(new Error('constraint failed', { cause }), { code });
}

describe('isUniqueViolation', () => {
    test('matches the raw driver error, which carries the code itself', () => {
        expect(isUniqueViolation(withCode('SQLITE_CONSTRAINT_UNIQUE'))).toBe(
            true
        );
    });

    test('matches a wrapped error through its cause', () => {
        const wrapped = new Error('query failed', {
            cause: { code: 'SQLITE_CONSTRAINT_UNIQUE' },
        });
        expect(isUniqueViolation(wrapped)).toBe(true);
    });

    test('rejects other errors', () => {
        expect(isUniqueViolation(new Error('boom'))).toBe(false);
        expect(
            isUniqueViolation(withCode('SQLITE_CONSTRAINT_FOREIGNKEY'))
        ).toBe(false);
        expect(isUniqueViolation(null)).toBe(false);
        expect(isUniqueViolation('SQLITE_CONSTRAINT_UNIQUE')).toBe(false);
    });

    test('stops after a few cause links', () => {
        let err: unknown = { code: 'SQLITE_CONSTRAINT_UNIQUE' };
        for (let i = 0; i < 5; i++) err = new Error('wrap', { cause: err });
        expect(isUniqueViolation(err)).toBe(false);
    });
});
