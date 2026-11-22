export const NAME_MAX = 100;
const FALLBACK_NAME = 'Quizaroni user';

const CONTROL_CHARS = /[\p{Cc}\p{Zl}\p{Zp}]/gu;

function clean(value: string): string {
    const stripped = value.replace(CONTROL_CHARS, '').trim();
    let out = '';
    for (const char of stripped) {
        if (out.length + char.length > NAME_MAX) break;
        out += char;
    }
    return out.trim();
}

// For names a provider chose: they can be empty, padded or carry control
// characters, none of which the sign-up form would have let through.
export function displayName(name: string, email: string): string {
    return clean(name) || clean(email.split('@')[0] ?? '') || FALLBACK_NAME;
}
