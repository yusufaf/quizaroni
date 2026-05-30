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

## Pull requests

1. Branch off `main`.
2. Make your change with tests/docs where relevant.
3. Ensure `pnpm build` and `pnpm test` pass.
4. Open a PR with a clear description.

Do **not** commit secrets. All credentials go in untracked `.env` files.
