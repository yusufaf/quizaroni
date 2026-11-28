import {
    darken,
    decomposeColor,
    getContrastRatio,
    hslToRgb,
    lighten,
    rgbToHex,
} from '@mui/material/styles';

const WHITE = '#ffffff';
const BLACK = '#000000';

export const devWarn = (message: string, ...details: unknown[]): void => {
    if (import.meta.env.DEV) console.warn(`[theme] ${message}`, ...details);
};

const toRgb = (color: string): string =>
    color.startsWith('hsl') ? hslToRgb(color) : color;

const alphaOf = (color: string): number =>
    decomposeColor(toRgb(color)).values[3] ?? 1;

// Composites a translucent colour over an opaque background, as the browser
// paints it. MUI's getContrastRatio ignores alpha, so measure this instead.
export const over = (fg: string, bg: string): string => {
    const { values: f } = decomposeColor(toRgb(fg));
    const { values: b } = decomposeColor(toRgb(bg));
    const a = f[3] ?? 1;
    const mix = b
        .slice(0, 3)
        .map((bv, i) => Math.round((f[i] ?? 0) * a + bv * (1 - a)));
    return rgbToHex(`rgb(${mix.join(', ')})`);
};

// Throws on unparsable input; the exported helpers below catch it.
export const ratio = (fg: string, bg: string, base?: string): number => {
    let solid = bg;
    if (alphaOf(bg) < 1) {
        if (!base) devWarn(`ratio: translucent ${bg} without a base`);
        const flatBase =
            base && alphaOf(base) < 1 ? over(base, WHITE) : (base ?? WHITE);
        solid = over(bg, flatBase);
    }
    return getContrastRatio(over(fg, solid), solid);
};

export const ensureContrast = (
    fg: string,
    bgs: readonly string[],
    min: number,
    base?: string
): string => {
    try {
        if (bgs.length === 0) return fg;
        const score = (c: string) =>
            Math.min(...bgs.map((b) => ratio(c, b, base)));
        if (score(fg) >= min) return fg;
        const toBlack = score(BLACK) > score(WHITE);
        for (let i = 1; i <= 20; i++) {
            const step = 0.05 * i;
            const c = toBlack ? darken(fg, step) : lighten(fg, step);
            if (score(c) >= min) return c;
        }
        devWarn(`ensureContrast: ${fg} can't reach ${min}:1`, bgs);
        return toBlack ? BLACK : WHITE;
    } catch (error) {
        devWarn(`ensureContrast: invalid colour ${fg}`, error);
        return fg;
    }
};

export const pickOnColor = (
    bg: string,
    candidates: readonly string[],
    min = 4.5,
    base?: string
): string => {
    try {
        const found = candidates.find((c) => ratio(c, bg, base) >= min);
        if (found) return found;
        return ratio(BLACK, bg, base) >= ratio(WHITE, bg, base) ? BLACK : WHITE;
    } catch (error) {
        devWarn(`pickOnColor: invalid colour ${bg}`, error);
        return BLACK;
    }
};
