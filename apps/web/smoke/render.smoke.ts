import { randomUUID } from 'node:crypto';
import { expect, test as base, type Page } from '@playwright/test';
import { ADMIN, BASE_URL } from './server';

const test = base.extend<{ problems: string[] }>({
    problems: [
        async ({ page }, use) => {
            const problems: string[] = [];
            page.on('pageerror', (e) =>
                problems.push(`pageerror: ${e.message}`)
            );
            page.on('console', (m) => {
                if (m.type() === 'error') {
                    problems.push(
                        `console.error: ${m.text()} at ${m.location().url}`
                    );
                }
            });
            await use(problems);
            await page
                .waitForLoadState('networkidle', { timeout: 5_000 })
                .catch(() => {});
            expect(problems, problems.join('\n')).toEqual([]);
        },
        { auto: true },
    ],
});

async function expectNoCrash(page: Page) {
    await expect(
        page.getByRole('heading', { name: 'Something went wrong' })
    ).toHaveCount(0);
    await expect(
        page.getByRole('heading', { name: 'Page not found' })
    ).toHaveCount(0);
}

async function expectProviderButtons(page: Page) {
    await expect(
        page.getByRole('button', { name: 'Continue with Google' })
    ).toBeVisible();
    await expect(
        page.getByRole('button', { name: 'Continue with GitHub' })
    ).toBeVisible();
}

test('/ renders the landing page', async ({ page }) => {
    await page.goto('/');
    await expect(
        page.getByRole('heading', { level: 1, name: /Learn anything/ })
    ).toBeVisible();
    await expectNoCrash(page);
});

test('/login renders the form and both provider buttons', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Log in' })).toBeVisible();
    await expectProviderButtons(page);
    await expectNoCrash(page);
});

test('/signUp renders the form and both provider buttons', async ({ page }) => {
    await page.goto('/signUp');
    await expect(
        page.getByRole('heading', { name: 'Create an account' })
    ).toBeVisible();
    await expectProviderButtons(page);
    await expectNoCrash(page);
});

test('/explore renders', async ({ page }) => {
    await page.goto('/explore');
    await expect(
        page.getByRole('heading', { level: 1, name: 'Explore', exact: true })
    ).toBeVisible();
    await expectNoCrash(page);
});

test('signed-in Home renders a study set (ISO dates)', async ({ page }) => {
    await page.goto('/login');
    await page.locator('#login-email').fill(ADMIN.email);
    await page.locator('#login-password').fill(ADMIN.pass);
    await page.getByRole('button', { name: 'Log in', exact: true }).click();
    await expect(page).toHaveURL(BASE_URL + '/');

    const post = (path: string, body: unknown) =>
        page.evaluate(
            async ([p, b]) => {
                const r = await fetch(`/api/${p}`, {
                    method: 'POST',
                    credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(b),
                });
                if (!r.ok) throw new Error(`${p} ${r.status}`);
                return r.json();
            },
            [path, body] as const
        );

    await post('users/update-metadata', {
        updates: { preferredDateFormat: 'YYYY-MM-DD' },
    });
    const { studyset } = await post('studysets/create-studyset', {});
    await post('studysets/update-studyset', {
        studysetUUID: studyset.studysetUUID,
        updates: {
            title: 'Smoke set',
            cards: [
                {
                    cardUUID: randomUUID(),
                    term: 'term',
                    definition: 'definition',
                    categories: [],
                    files: [],
                    important: false,
                    notes: [],
                },
            ],
        },
    });

    await page.reload();
    await expect(page.getByText('Smoke set').first()).toBeVisible();
    await expect(
        page.getByText(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/).first()
    ).toBeVisible();
    await expectNoCrash(page);
});
