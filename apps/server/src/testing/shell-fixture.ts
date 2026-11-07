import { copyFileSync } from 'node:fs';
import { join } from 'node:path';
import type { RouteHarness } from './route-harness';

// The web app's real index.html, so tests catch a shell change that the SEO
// rewrites no longer match.
export const WEB_SHELL_PATH = join(import.meta.dir, '../../../web/index.html');

export function installFixtureShell(h: RouteHarness): void {
    copyFileSync(WEB_SHELL_PATH, join(h.webDir, 'index.html'));
}
