import { expect, test } from 'bun:test';
import { isIPv4 } from 'node:net';
import { nextTestIp } from './testing';

// The rate-limit store is process-wide, so a repeated IP makes unrelated
// tests trip each other's limits once the suite grows.
test('nextTestIp never repeats across a large suite', () => {
    const ips = Array.from({ length: 5000 }, nextTestIp);
    expect(new Set(ips).size).toBe(ips.length);
    expect(ips.every((ip) => isIPv4(ip))).toBe(true);
});
