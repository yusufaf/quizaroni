export const randomUUID = (): string => {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();

    // Browsers only expose crypto.randomUUID in a secure context, so a
    // self-hosted instance served over plain HTTP on a LAN lacks it (#381).
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6]! & 0x0f) | 0x40;
    bytes[8] = (bytes[8]! & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0'));
    return [
        hex.slice(0, 4),
        hex.slice(4, 6),
        hex.slice(6, 8),
        hex.slice(8, 10),
        hex.slice(10, 16),
    ]
        .map((part) => part.join(''))
        .join('-');
};
