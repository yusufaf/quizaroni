import { AIProvider } from './providers';

const STORAGE_KEY = 'quizaroni-ai-keys';

const getSalt = () => new TextEncoder().encode('quizaroni-fixed-salt-2026');

const deriveKey = async (userUUID: string): Promise<CryptoKey> => {
    const encoder = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
        'raw',
        encoder.encode(userUUID),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    return window.crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: getSalt(),
            iterations: 100000,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
};

const getStorage = () => {
    try {
        const item = localStorage.getItem(STORAGE_KEY);
        return item ? JSON.parse(item) : {};
    } catch {
        return {};
    }
};

const setStorage = (data: any) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const saveApiKey = async (
    provider: AIProvider,
    apiKey: string,
    userUUID: string
): Promise<void> => {
    if (!apiKey) return;
    const key = await deriveKey(userUUID);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoder = new TextEncoder();

    const encrypted = await window.crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        encoder.encode(apiKey)
    );

    const storage = getStorage();
    storage[provider] = {
        iv: Array.from(iv),
        data: Array.from(new Uint8Array(encrypted)),
    };
    setStorage(storage);
};

export const getApiKey = async (
    provider: AIProvider,
    userUUID: string
): Promise<string | null> => {
    const storage = getStorage();
    const providerData = storage[provider];
    if (!providerData) return null;

    try {
        const key = await deriveKey(userUUID);
        const iv = new Uint8Array(providerData.iv);
        const data = new Uint8Array(providerData.data);

        const decrypted = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            data
        );

        return new TextDecoder().decode(decrypted);
    } catch {
        return null; // Decryption failed or key changed
    }
};

export const deleteApiKey = async (provider: AIProvider): Promise<void> => {
    const storage = getStorage();
    delete storage[provider];
    setStorage(storage);
};

export const hasApiKey = (provider: AIProvider): boolean => {
    const storage = getStorage();
    return !!storage[provider];
};
