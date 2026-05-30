# Security Policy

## Reporting a vulnerability

Please **do not** open a public issue for security vulnerabilities.

Instead, report them privately via GitHub's
[Report a vulnerability](https://github.com/yusufaf/quizaroni/security/advisories/new)
flow, or email the maintainer at yusufafzal12@gmail.com.

You can expect an initial response within 7 days. Please include steps to
reproduce and the impact you've identified.

## Secrets

This repository must never contain real secrets (API keys, client secrets,
tokens). All credentials are supplied via untracked `.env` files — see the
`.env.example` files in `apps/web` and `apps/api`. If you find a committed
secret, report it as above.
