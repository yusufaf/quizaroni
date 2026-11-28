import { ratio } from './contrast';

// Test-only: throws so a failing pair names its colours and ratio.
export const assertContrast = (
    fg: string,
    bg: string,
    min: number,
    base?: string
): void => {
    const r = ratio(fg, bg, base);
    if (r < min) {
        throw new Error(`${fg} on ${bg}: ${r.toFixed(2)} < ${min}`);
    }
};
