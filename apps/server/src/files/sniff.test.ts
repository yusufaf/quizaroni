import { describe, expect, test } from 'bun:test';
import { sniffContentType } from './sniff';

const enc = (text: string) => new TextEncoder().encode(text);
const pad = (head: number[] | Uint8Array) => {
    const out = new Uint8Array(16);
    out.set(head);
    return out;
};
const riff = (form: string) =>
    pad([...enc('RIFF'), 0x24, 0, 0, 0, ...enc(form)]);

describe('sniffContentType', () => {
    test.each([
        ['image/png', pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
        ['image/jpeg', pad([0xff, 0xd8, 0xff, 0xe0])],
        ['image/gif', pad(enc('GIF89a'))],
        ['image/gif', pad(enc('GIF87a'))],
        ['image/webp', riff('WEBP')],
        ['audio/wav', riff('WAVE')],
        ['audio/ogg', pad(enc('OggS'))],
        ['audio/mpeg', pad(enc('ID3'))],
        ['audio/mpeg', pad([0xff, 0xfb, 0x90])],
        ['audio/mp4', pad([0, 0, 0, 0x20, ...enc('ftypM4A ')])],
    ])('%s', (type, head) => {
        expect(sniffContentType(head)).toBe(type as never);
    });

    test.each([
        ['svg', pad(enc('<svg xmlns="ht'))],
        ['xml', pad(enc('<?xml version'))],
        ['html', pad(enc('<!doctype html>'))],
        ['pdf', pad(enc('%PDF-1.7'))],
        ['zip', pad([0x50, 0x4b, 0x03, 0x04])],
        ['avi', riff('AVI ')],
        ['mp4 video', pad([0, 0, 0, 0x20, ...enc('ftypisom')])],
        ['empty', new Uint8Array(0)],
        ['two bytes', new Uint8Array([0xff, 0xd8])],
    ])('rejects %s', (_name, head) => {
        expect(sniffContentType(head)).toBeUndefined();
    });
});
