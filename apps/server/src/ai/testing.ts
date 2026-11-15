// Model names that must never reach an upstream URL.
export const CRAFTED_MODELS = [
    '../x',
    'gemini/../../v1/files',
    'a/b',
    'a?key=1',
    'a#b',
    'a b',
    '%2e%2e',
    'a%2Fb',
    'gemini-pro:streamGenerateContent',
    '.hidden',
    '',
    'a\nb',
    'x'.repeat(101),
    '@evil.example',
];
