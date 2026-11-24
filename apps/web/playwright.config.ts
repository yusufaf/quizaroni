import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig, devices } from '@playwright/test';
import { ADMIN, BASE_URL, PORT } from './smoke/server';

const dataDir = (process.env.QZ_SMOKE_DATA_DIR ??= mkdtempSync(
    join(tmpdir(), 'qz-smoke-')
));
const binary = process.env.QZ_SMOKE_BINARY;
const webDir = fileURLToPath(new URL('./dist', import.meta.url));

const command = `${
    binary ? `"${binary}"` : `bun ../server/src/index.ts --web-dir "${webDir}"`
} --port ${PORT} --data-dir "${dataDir}" --open-browser false`;

export default defineConfig({
    testDir: './smoke',
    testMatch: '*.smoke.ts',
    workers: 1,
    retries: 0,
    forbidOnly: !!process.env.CI,
    timeout: 30_000,
    expect: { timeout: 10_000 },
    reporter: process.env.CI
        ? [['github'], ['list'], ['html', { open: 'never' }]]
        : 'list',
    use: { baseURL: BASE_URL, trace: 'retain-on-failure' },
    projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
    webServer: {
        command,
        url: `http://127.0.0.1:${PORT}/api/health`,
        reuseExistingServer: false,
        timeout: 60_000,
        stdout: 'pipe',
        stderr: 'pipe',
        env: {
            QZ_ADMIN_EMAIL: ADMIN.email,
            QZ_ADMIN_PASSWORD: ADMIN.pass,
            QZ_REGISTRATION_MODE: 'open',
            QZ_GOOGLE_CLIENT_ID: 'smoke',
            QZ_GOOGLE_CLIENT_SECRET: 'smoke',
            QZ_GITHUB_CLIENT_ID: 'smoke',
            QZ_GITHUB_CLIENT_SECRET: 'smoke',
        },
    },
});
