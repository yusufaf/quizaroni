// Generates all favicon / PWA / app icons from the brand source image.
// Source: brand/logo-source.jpg (square). Run via `pnpm gen:icons`.
//
// Outputs proper, correctly-formatted assets (the originals were a single
// JPEG renamed to .png/.ico). Regenerate any time the source logo changes.

import sharp from 'sharp';
import pngToIco from 'png-to-ico';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const SRC = resolve(root, 'brand/logo-source.jpg');
const PUBLIC = resolve(root, 'public');
const RES = resolve(root, 'src/resources');

// The source is an app-icon (dark rounded square) framed by a white margin.
// Trim that white border so the artwork fills the icon frame edge-to-edge.
async function trimmedSource() {
    return sharp(SRC).trim({ background: '#ffffff', threshold: 20 }).toBuffer();
}

// Sample the logo's dark background colour (just inside the top edge, above the
// artwork) so the maskable safe-zone backfill blends with the icon.
async function sampleBgColor(src) {
    const meta = await sharp(src).metadata();
    const x = Math.round(meta.width / 2);
    const y = Math.round(meta.height * 0.06);
    const { data } = await sharp(src)
        .extract({ left: x, top: y, width: 4, height: 4 })
        .raw()
        .toBuffer({ resolveWithObject: true });
    return { r: data[0], g: data[1], b: data[2] };
}

// Plain resize (any-purpose icon / app logo).
async function resizePng(src, size, out) {
    await sharp(src).resize(size, size, { fit: 'cover' }).png().toFile(out);
}

// Maskable icon: full-bleed dark background with the logo scaled into the
// ~80% safe zone, centred (per the maskable spec's 40% safe radius).
async function maskablePng(src, size, out, bg) {
    const inner = Math.round(size * 0.8);
    const logo = await sharp(src)
        .resize(inner, inner, { fit: 'cover' })
        .toBuffer();
    await sharp({
        create: {
            width: size,
            height: size,
            channels: 4,
            background: { ...bg, alpha: 1 },
        },
    })
        .composite([{ input: logo, gravity: 'center' }])
        .png()
        .toFile(out);
}

// Splash screen: full-bleed dark background with the logo centred.
async function generateSplash(src, width, height, out, bg) {
    const logoSize = Math.round(Math.min(width, height) * 0.35);
    const logo = await sharp(src)
        .resize(logoSize, logoSize, { fit: 'contain' })
        .toBuffer();
    await sharp({
        create: {
            width,
            height,
            channels: 4,
            background: { ...bg, alpha: 1 },
        },
    })
        .composite([{ input: logo, gravity: 'center' }])
        .png()
        .toFile(out);
}

async function main() {
    await mkdir(PUBLIC, { recursive: true });
    await mkdir(RES, { recursive: true });
    const src = await trimmedSource();
    const bg = await sampleBgColor(src);
    const hex =
        '#' +
        [bg.r, bg.g, bg.b].map((c) => c.toString(16).padStart(2, '0')).join('');
    console.log(`sampled logo bg: ${hex}`);

    // PWA manifest icons (served from web root).
    await resizePng(src, 192, resolve(PUBLIC, 'icon-192x192.png'));
    await resizePng(src, 512, resolve(PUBLIC, 'icon-512x512.png'));
    await maskablePng(
        src,
        512,
        resolve(PUBLIC, 'icon-512x512-maskable.png'),
        bg
    );

    // Favicons + apple touch icons (served from web root).
    await resizePng(src, 180, resolve(PUBLIC, 'apple-touch-icon.png'));
    await resizePng(src, 180, resolve(PUBLIC, 'apple-touch-icon-180x180.png'));
    await resizePng(src, 167, resolve(PUBLIC, 'apple-touch-icon-167x167.png'));
    await resizePng(src, 152, resolve(PUBLIC, 'apple-touch-icon-152x152.png'));
    await resizePng(src, 120, resolve(PUBLIC, 'apple-touch-icon-120x120.png'));
    await resizePng(src, 32, resolve(PUBLIC, 'favicon-32x32.png'));
    await resizePng(src, 16, resolve(PUBLIC, 'favicon-16x16.png'));
    const icoSizes = await Promise.all(
        [16, 32, 48].map((s) =>
            sharp(src).resize(s, s, { fit: 'cover' }).png().toBuffer()
        )
    );
    await writeFile(resolve(PUBLIC, 'favicon.ico'), await pngToIco(icoSizes));

    // App logo imported by the NavBar (the original was a JPEG renamed .png).
    await resizePng(src, 1024, resolve(RES, 'logo.png'));

    // iOS Splash Screens
    const splashDir = resolve(PUBLIC, 'splash');
    await mkdir(splashDir, { recursive: true });
    const splashSizes = [
        [1320, 2868],
        [1179, 2556],
        [1284, 2778],
        [1170, 2532],
        [1242, 2688],
        [828, 1792],
        [1125, 2436],
        [1242, 2208],
        [750, 1334],
        [2048, 2732],
        [1668, 2388],
        [1640, 2360],
        [1620, 2160],
        [1488, 2266],
    ];
    for (const [w, h] of splashSizes) {
        await generateSplash(
            src,
            w,
            h,
            resolve(splashDir, `apple-splash-${w}-${h}.png`),
            bg
        );
    }

    console.log('icons generated.');
    return hex;
}

main()
    .then((hex) => {
        // Emit sampled colour on a parseable line for downstream use.
        console.log(`BG_HEX=${hex}`);
    })
    .catch((err) => {
        console.error(err);
        process.exit(1);
    });
