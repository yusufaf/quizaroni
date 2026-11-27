<p align="center">
  <img src="./logo.png" width="128" alt="Quizaroni Logo" style="border-radius: 20%" />
</p>

# Quizaroni

Turn any topic into flashcards you'll actually enjoy studying, with five study
modes, real spaced repetition, offline access, and public sharing. Free.

**Try it: [quizaroni.yusufaf.dev](https://quizaroni.yusufaf.dev)**

![Quizaroni landing page](./apps/web/public/og-image.png)

## Development

A React PWA and a self-hostable Bun server, in a **pnpm monorepo**:

| Workspace    | Path                    | Stack                                                  |
| ------------ | ----------------------- | ------------------------------------------------------ |
| Frontend     | `apps/web`              | React 18 · TypeScript · Vite+ · Material UI · PWA       |
| Server       | `apps/server`           | Bun · Hono · SQLite (Drizzle) · better-auth            |
| Shared types | `packages/shared-types` | Domain types and constants used by both apps           |

### Architecture

```
 Browser (React PWA, offline cache in IndexedDB)
        │  same origin, session cookie
        ▼
 quizaroni-server (Bun + Hono)
   ├── serves the built web app
   └── /api ──► SQLite database   ┐
            ──► uploaded files    ┘ both in the data directory
```

One process serves the app and the API. Releases ship it as standalone
binaries (with the web app built in) and as the `ghcr.io/yusufaf/quizaroni`
image; `docker-compose.yml` at the root runs that image.

### Quick start

```bash
pnpm install

# Develop: the server on :8080, the web dev server on :3000 proxying /api to it
pnpm dev:server
pnpm dev:web                       # http://127.0.0.1:3000

# Or run the built app from the server alone
pnpm build:web && pnpm start:server   # http://127.0.0.1:8080
```

On first start the server prints a setup token. Open
`http://127.0.0.1:8080/setup` to create the admin account; the dev proxy
forwards only `/api`. `dev:server` keeps its data in `apps/server/data/`.

### Configuration

The server takes flags or the matching `QZ_*` environment variables (port,
data directory, public URL, SMTP, Google/GitHub sign-in, ...). To list them,
run a release binary with `--help`, or `bun src/index.ts --help` from
`apps/server`.

No secrets are committed. `apps/web/.env.example` lists the optional build-time
flags. `deploy/hosted/` holds the Compose file, Caddyfile and `.env.example`
for the hosted instance at quizaroni.yusufaf.dev.

### Repo scripts

Run from the root:

| Command             | Description                                          |
| ------------------- | ---------------------------------------------------- |
| `pnpm dev:web`      | Start the frontend dev server                        |
| `pnpm dev:server`   | Start the server in watch mode for the dev frontend  |
| `pnpm build:web`    | Build the web app into `apps/web/dist`               |
| `pnpm start:server` | Start the server, serving `apps/web/dist`            |
| `pnpm build:binary` | Build the standalone server binaries                 |
| `pnpm build`        | Build all workspaces                                 |
| `pnpm typecheck`    | Type-check the frontend and the server               |
| `pnpm test`         | Run tests across workspaces                          |
| `pnpm test:smoke`   | Smoke-test the built app in a browser                |

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Commits follow
[Conventional Commits](https://www.conventionalcommits.org/); releases are
automated with release-please.

## Security

Found a vulnerability or a committed secret? See [SECURITY.md](./SECURITY.md).

## License

[MIT](./LICENSE) © 2026 Yusuf Afzal
