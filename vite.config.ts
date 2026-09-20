import { defineConfig } from 'vite-plus';

// Vite+ 0.3 only reads lint/fmt/staged settings from the workspace root;
// package-level blocks are ignored. Keep them here, not in apps/web.
export default defineConfig({
    staged: {
        '*.{js,jsx,ts,tsx}': ['vp lint --fix', 'vp fmt --write'],
        '*.{json,md,css,html,yml,yaml}': 'vp fmt --write',
    },
    lint: { options: { typeAware: true, typeCheck: true } },
    fmt: {
        trailingComma: 'es5',
        tabWidth: 4,
        semi: true,
        singleQuote: true,
        printWidth: 80,
        sortPackageJson: false,
        // Only apps/web was ever vp-formatted; apps/api has its own
        // .prettierrc and the rest was never run through a formatter.
        ignorePatterns: ['apps/api', 'packages', 'docs', '.github', '*.md'],
    },
});
