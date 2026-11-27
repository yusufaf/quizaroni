# Contributing to Quizaroni

Thanks for your interest in contributing! This is a pnpm monorepo with three
workspaces: `apps/web` (React frontend), `apps/server` (Bun server: API, auth,
SQLite, file storage, and serving the built app) and `packages/shared-types`
(types shared by both).

## Prerequisites

- Node.js 24.11+ (matches `apps/web/.node-version`) or 22.18+. The test runner
  (Vitest 5, bundled in Vite+ 1.x) does not support Node 20.
- pnpm >= 10 (`npm i -g pnpm`)
- Bun 1.4.4+ for `apps/server` (it runs the server and its tests).

No cloud account is needed: everything runs locally.

## Setup

```bash
pnpm install                      # installs all workspaces
```

That's all. `apps/web/.env.example` lists optional build-time flags; copy it to
`apps/web/.env` only if you want to change one.

## Common commands

Run from the repo root:

```bash
pnpm dev:server   # start the server on port 8080 (watch mode)
pnpm dev:web      # start the frontend dev server (port 3000, proxies /api to :8080)
pnpm build:web    # production build of the frontend
pnpm start:server # serve the built frontend and the API on port 8080
pnpm build:binary # build the standalone server binaries
pnpm typecheck    # type-check the frontend and the server
pnpm test         # run tests across workspaces
pnpm test:smoke   # load the built app in Chromium (pnpm build:web first; once: pnpm --filter @quizaroni/web exec playwright install chromium)
```

On first start the server prints a setup token; open
`http://127.0.0.1:8080/setup` to create the admin account.

## Commit conventions

This repo uses [Conventional Commits](https://www.conventionalcommits.org/),
enforced by commitlint via a husky `commit-msg` hook. Examples:

```
feat(web): add dark mode toggle
fix(server): reject an expired invite link
chore(deps): bump hono
```

Releases are automated with release-please based on these commit messages.

## Picking up an issue

Issues labeled
[`good first issue`](https://github.com/yusufaf/quizaroni/labels/good%20first%20issue)
are scoped for new contributors. For a new feature or a large change, open an
issue to discuss it before writing code.

1. Comment on the issue to claim it, and wait to be assigned before starting.
   This avoids two people opening PRs for the same fix. I aim to reply within
   about a week; if you haven't heard back by then, go ahead and start.
2. Skip issues that already have an assignee or an open PR linked to them.
3. If an issue says it is blocked on another PR, wait for that PR to merge.
4. If you can no longer work on an assigned issue, say so in a comment so it
   can be reassigned. If no PR is opened or updated within two weeks of
   assignment, the issue may be reassigned.

## Translations

The web app supports English and Spanish via `react-i18next`.

- New user-facing strings, including `aria-label`s and tooltip titles, go
  through `t()`. New components should always use `useTranslation`. Some
  older files are still hardcoded (tracked in #49); when editing one of those,
  matching its existing strings is fine unless your issue is to translate it.
- Add every new key to both `apps/web/src/i18n/locales/en/` and
  `apps/web/src/i18n/locales/es/`. If you can't write Spanish, copy the English
  text into the `es` file and say so in your PR.
- A new namespace (a new `.json` file) also needs three edits in
  `apps/web/src/i18n/index.ts`: import both the `en` and `es` files, add both
  under `resources`, and add the name to the `ns` array. Otherwise `t()`
  returns raw keys.

## Pull requests

1. Branch off `main`, and keep each PR focused on one issue.
2. Make your change with tests/docs where relevant.
3. Lint and format only the files you changed, since running these across
   the whole repo rewrites unrelated code:
   ```bash
   # apps/web: lint .ts/.tsx, format .ts/.tsx/.json/.css
   pnpm exec vp lint --fix apps/web/src/path/to/File.tsx ...
   pnpm exec vp fmt apps/web/src/path/to/File.tsx ...
   ```
4. Make sure `pnpm typecheck`, `pnpm test` and `pnpm build` (all workspaces)
   pass.
5. Open a PR with a clear description, and include `Fixes #<issue>` so the
   issue closes when the PR merges. For UI changes, add a screenshot or short
   recording. Leave "Allow edits from maintainers" checked.

Do **not** commit secrets. All credentials go in untracked `.env` files.

## Questions and security issues

Ask questions by opening an issue. Report security vulnerabilities privately as
described in [SECURITY.md](SECURITY.md), not in a public issue.
