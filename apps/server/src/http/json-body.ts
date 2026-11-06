import type { Context } from 'hono';
import { isPlainObject, type JsonObject } from '../users/metadata';

export const INVALID_JSON: unique symbol = Symbol('invalid JSON');

// A body that parses to something other than an object (`null`, an array)
// reads as `{}`, so the handler answers 400 for the missing field.
export async function readJsonBody(
    c: Context
): Promise<JsonObject | typeof INVALID_JSON> {
    const text = await c.req.text();
    if (text === '') return {};
    try {
        const parsed: unknown = JSON.parse(text);
        return isPlainObject(parsed) ? parsed : {};
    } catch {
        return INVALID_JSON;
    }
}
