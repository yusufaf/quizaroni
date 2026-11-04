import { describe, expect, test } from 'bun:test';
import { pickClientIp } from './client-ip';

const SOCKET = '10.0.0.5';

describe('pickClientIp', () => {
    test('ignores X-Forwarded-For when the proxy is not trusted', () => {
        expect(pickClientIp(SOCKET, '198.51.100.7', false)).toBe(SOCKET);
    });

    test('takes the rightmost X-Forwarded-For entry from a trusted proxy', () => {
        expect(pickClientIp(SOCKET, '198.51.100.7, 203.0.113.9', true)).toBe(
            '203.0.113.9'
        );
    });

    test('falls back to the socket when the rightmost entry is not an IP', () => {
        expect(pickClientIp(SOCKET, '198.51.100.7, garbage', true)).toBe(
            SOCKET
        );
    });

    test('falls back to the socket when there is no X-Forwarded-For', () => {
        expect(pickClientIp(SOCKET, undefined, true)).toBe(SOCKET);
    });

    test('returns undefined with no socket address and no trusted header', () => {
        expect(pickClientIp(undefined, '198.51.100.7', false)).toBeUndefined();
    });

    test('accepts an IPv6 rightmost entry', () => {
        expect(pickClientIp(SOCKET, '198.51.100.7, 2001:db8::1', true)).toBe(
            '2001:db8::1'
        );
    });
});
