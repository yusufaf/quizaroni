import { isIP } from 'node:net';
import { getConnInfo } from '@hono/bun';
import type { Context } from 'hono';

// One trusted proxy hop: the rightmost X-Forwarded-For entry is the address
// that proxy saw. Anything to its left is client-supplied.
export function pickClientIp(
    socketIp: string | undefined,
    forwardedFor: string | undefined,
    trustProxy: boolean
): string | undefined {
    if (trustProxy && forwardedFor) {
        const rightmost = forwardedFor.split(',').at(-1)?.trim() ?? '';
        if (isIP(rightmost)) return rightmost;
    }
    return socketIp;
}

export function socketIp(c: Context): string | undefined {
    try {
        return getConnInfo(c).remote.address;
    } catch {
        return undefined;
    }
}
