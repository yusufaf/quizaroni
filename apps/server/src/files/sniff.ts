export const CARD_FILE_TYPES = [
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'audio/mpeg',
    'audio/mp4',
    'audio/ogg',
    'audio/wav',
] as const;

export const AVATAR_TYPES = ['image/png', 'image/jpeg', 'image/webp'] as const;

export type SniffedType = (typeof CARD_FILE_TYPES)[number];

// What browsers may report for an allowed file. Only used for an early
// reject at initiate; the bytes decide at complete.
export const DECLARED_CARD_TYPES: ReadonlySet<string> = new Set([
    ...CARD_FILE_TYPES,
    'image/jpg',
    'image/pjpeg',
    'audio/mp3',
    'audio/x-m4a',
    'audio/m4a',
    'audio/x-wav',
    'audio/wave',
    'audio/vnd.wave',
]);

export const SNIFF_BYTES = 16;

const ascii = (head: Uint8Array, at: number, text: string) =>
    text.split('').every((ch, i) => head[at + i] === ch.charCodeAt(0));

const bytes = (head: Uint8Array, at: number, values: number[]) =>
    values.every((v, i) => head[at + i] === v);

const MP3_FRAME_SECOND = new Set([0xfb, 0xfa, 0xf3, 0xf2, 0xe3, 0xe2]);

// The type is decided by the file's leading bytes, never by its name or the
// type the client declared, so an HTML or SVG file can't pass as an image.
export function sniffContentType(head: Uint8Array): SniffedType | undefined {
    if (bytes(head, 0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
        return 'image/png';
    }
    if (bytes(head, 0, [0xff, 0xd8, 0xff])) return 'image/jpeg';
    if (ascii(head, 0, 'GIF87a') || ascii(head, 0, 'GIF89a')) {
        return 'image/gif';
    }
    if (ascii(head, 0, 'RIFF') && ascii(head, 8, 'WEBP')) return 'image/webp';
    if (ascii(head, 0, 'RIFF') && ascii(head, 8, 'WAVE')) return 'audio/wav';
    if (ascii(head, 0, 'OggS')) return 'audio/ogg';
    if (ascii(head, 0, 'ID3')) return 'audio/mpeg';
    if (head[0] === 0xff && MP3_FRAME_SECOND.has(head[1] ?? -1)) {
        return 'audio/mpeg';
    }
    if (
        ascii(head, 4, 'ftyp') &&
        (ascii(head, 8, 'M4A ') || ascii(head, 8, 'M4B '))
    ) {
        return 'audio/mp4';
    }
    return undefined;
}
