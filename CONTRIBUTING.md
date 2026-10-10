# Contributing to Quizaroni

Thanks for your interest in contributing! This is a pnpm monorepo with two
workspaces: `apps/web` (React frontend) and `apps/api` (AWS CDK backend).

## Prerequisites

- Node.js >= 20
- pnpm >= 10 (`npm i -g pnpm`)
- For backend work: an AWS account + the AWS CLI configured, and the AWS CDK.

## Setup

```bash
pnpm install                      # installs all workspaces
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env   # fill in your values
```

## Common commands

Run from the repo root:

```bash
pnpm dev:web      # start the frontend dev server (port 3000)
pnpm build:web    # production build of the frontend
pnpm build:api    # compile the CDK / Lambda TypeScript
pnpm synth:api    # synthesize the CloudFormation template
pnpm deploy:api   # deploy the backend to AWS
pnpm test         # run tests across workspaces
```

## Commit conventions

This repo uses [Conventional Commits](https://www.conventionalcommits.org/),
enforced by commitlint via a husky `commit-msg` hook. Examples:

```
feat(web): add dark mode toggle
fix(api): correct CORS origin handling
chore(deps): bump aws-cdk-lib
```

Releases are automated with release-please based on these commit messages.

## Picking up an issue

Issues labeled
[`good first issue`](https://github.com/yusufaf/quizaroni/labels/good%20first%20issue)
are scoped for new contributors.

1. Comment on the issue to claim it, and wait to be assigned before starting.
   This avoids two people opening PRs for the same fix.
2. Skip issues that already have an assignee or an open PR linked to them.
3. If an issue says it is blocked on another PR, wait for that PR to merge.
4. If you can no longer work on an assigned issue, say so in a comment so it
   can be reassigned. Issues with no activity for two weeks may be reassigned.

## Translations

The web app supports English and Spanish via `react-i18next`. User-facing
strings, including `aria-label`s and tooltip titles, go through `t()` in any
file that already uses `useTranslation`. Add new keys to both
`apps/web/src/i18n/locales/en/` and `apps/web/src/i18n/locales/es/`.

## Pull requests

1. Branch off `main`.
2. Make your change with tests/docs where relevant.
3. Format the `apps/web` files you changed with
   `pnpm exec vp fmt path/to/File.tsx ...`. Pass only your own files, since
   running it across the whole repo reformats unrelated code.
4. Ensure `pnpm typecheck`, `pnpm test` and `pnpm build` pass (CI runs the
   same checks).
5. Open a PR with a clear description, and include `Fixes #<issue>` so the
   issue closes when the PR merges.

Do **not** commit secrets. All credentials go in untracked `.env` files.
