import { createAvatar } from '@dicebear/core';
import {
    adventurer,
    avataaars,
    bottts,
    lorelei,
    thumbs,
} from '@dicebear/collection';

export type AvatarStyle =
    | 'adventurer'
    | 'avataaars'
    | 'bottts'
    | 'lorelei'
    | 'thumbs';

export type AvatarPreset = {
    id: string;
    style: AvatarStyle;
    seed: string;
    label: string;
};

const STYLE_MAP = {
    adventurer,
    avataaars,
    bottts,
    lorelei,
    thumbs,
};

/**
 * Generate avatar data URI using DiceBear
 */
export const generateAvatarDataUri = (
    style: AvatarStyle,
    seed: string
): string => {
    const avatar = createAvatar(
        // Each DiceBear style declares its own Options type, so the union of
        // the five is not assignable to the single Style<Options> parameter.
        // Only `seed` and `size` are passed, which every style supports.
        STYLE_MAP[style] as Parameters<typeof createAvatar>[0],
        {
            seed,
            size: 512,
        }
    );
    return avatar.toDataUri();
};

/**
 * Generate DiceBear URL (for preview/display)
 */
export const generateDiceBearUrl = (
    style: AvatarStyle,
    seed: string
): string => {
    return generateAvatarDataUri(style, seed);
};

/**
 * Get preset avatar options for user
 */
export const getAvatarPresets = (userUUID: string): AvatarPreset[] => {
    const styles: AvatarStyle[] = [
        'adventurer',
        'avataaars',
        'bottts',
        'lorelei',
        'thumbs',
    ];
    const presets: AvatarPreset[] = [];

    styles.forEach((style) => {
        // Generate 8 variants per style using different seeds (40 total)
        for (let i = 0; i < 8; i++) {
            presets.push({
                id: `${style}-${i}`,
                style,
                seed: `${userUUID}-${style}-${i}`,
                label: `${style.charAt(0).toUpperCase() + style.slice(1)} ${i + 1}`,
            });
        }
    });

    return presets;
};

/**
 * Compress and resize image before upload
 */
export const prepareImageForUpload = async (
    file: File,
    maxSizeMB: number = 2,
    maxWidthOrHeight: number = 512
): Promise<{ base64: string; contentType: string; fileName: string }> => {
    const imageCompression = (await import('browser-image-compression'))
        .default;

    const options = {
        maxSizeMB,
        maxWidthOrHeight,
        useWebWorker: true,
    };

    const compressedFile = await imageCompression(file, options);

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = (reader.result as string).split(',')[1]; // Remove data URL prefix
            if (!base64) {
                reject(new Error('Could not read compressed image as base64'));
                return;
            }

            resolve({
                base64,
                contentType: compressedFile.type,
                fileName: file.name,
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(compressedFile);
    });
};
