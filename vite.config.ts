import { defineConfig } from 'vite-plus';

// Vite+ 0.3 only reads lint/fmt/staged settings from the workspace root;
// package-level blocks are ignored. Keep them here, not in apps/web.
export default defineConfig({
    staged: {
        '*.{js,jsx,ts,tsx}': ['vp lint --fix', 'vp fmt --write'],
        '*.{json,md,css,html,yml,yaml}': 'vp fmt --write',
    },
    lint: {
        options: { typeAware: true, typeCheck: true },
        rules: {
            // The bare deep path is the CommonJS file; its default import is the
            // module object in the production bundle (React #130, #365).
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: [
                                '@mui/icons-material/*',
                                '!@mui/icons-material/esm/*',
                            ],
                            importNames: ['default'],
                            message:
                                "Import icons from '@mui/icons-material' or '@mui/icons-material/esm/<Icon>'.",
                        },
                    ],
                },
            ],
        },
        overrides: [
            {
                // crypto.randomUUID only exists in a secure context, so a
                // plain-HTTP self-host can't boot when the web calls it (#381).
                files: ['apps/web/src/**'],
                excludeFiles: ['apps/web/src/shared/utilities/uuid.ts'],
                rules: {
                    'no-restricted-properties': [
                        'error',
                        {
                            object: 'crypto',
                            property: 'randomUUID',
                            message:
                                "Use randomUUID() from 'shared/utilities/uuid'; crypto.randomUUID is missing on plain-HTTP origins (#381).",
                        },
                    ],
                },
            },
        ],
    },
    fmt: {
        trailingComma: 'es5',
        tabWidth: 4,
        semi: true,
        singleQuote: true,
        printWidth: 80,
        sortPackageJson: false,
        // Only apps/web was ever vp-formatted; the rest was never run
        // through a formatter.
        ignorePatterns: [
            'apps/server/drizzle',
            'packages',
            'docs',
            '.github',
            '*.md',
        ],
    },
});
