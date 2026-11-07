import type { Context } from 'hono';

export const message = (
    c: Context,
    text: string,
    status: 400 | 403 | 404 | 409 | 413 | 415
) => c.json({ message: text }, status);
