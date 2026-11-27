# Quizaroni

A flashcard and quiz study application. Create study sets, organize cards with labels and notes, study with multiple modes, and share publicly.

Live: [quizaroni.yusufaf.dev](https://quizaroni.yusufaf.dev)

## Tech Stack

- **React 18** + **TypeScript** on **Vite+** (`vp`) — unified toolchain wrapping Vite, Vitest, Oxlint, Oxfmt
- **Material UI v5**, Emotion, Framer Motion
- **State**: Redux Toolkit (RTK Query), Zustand, TanStack Query
- **Routing**: React Router v6
- **Auth**: session cookie from the server's better-auth endpoints
- **i18n**: react-i18next (English, Spanish)
- **Storage**: Dexie (IndexedDB) for offline cache
- **Deploy**: served by `apps/server`, which embeds this build in its binaries and Docker image

## Prerequisites

- Node.js (version pinned in `.node-version`)
- pnpm 10.x (via `packageManager` field — Vite+ wraps it)

## Getting Started

```bash
pnpm install
vp dev          # starts dev server on http://127.0.0.1:3000
```

The dev server proxies `/api` to the server on `127.0.0.1:8080`. Start it with
`pnpm dev:server` from the repo root.

Other commands:

```bash
vp build        # production build → dist/
vp preview      # preview production build
vp check        # format + lint + typecheck
vp test         # run Vitest
```

`vp` is the Vite+ CLI. If it's not on your path, install it from [vite.dev/plus](https://vite.dev/plus/).

## Project Structure

```
src/
├── resources/    # Static assets
├── shared/       # Reusable components, hooks, theme
├── state/
│   ├── api/      # RTK Query + custom API clients
│   ├── slices/   # Redux slices
│   └── stores/   # Zustand stores
├── views/        # Page-level route components
└── i18n/         # Translation files
```

Path aliases (`vite.config.ts` + `tsconfig.json`): `views/*`, `shared/*`, `components/*`, `state/*`, `hooks/*`, `theme/*`, `utilities/*`, `constants/*`, `lib/*`, `resources/*`, `styles/*`.

## API

The app calls the same-origin `/api` (`src/state/api/apiClient.ts`). In development the Vite proxy forwards it to `pnpm dev:server`; in production the server in `apps/server` serves both the built app and the API.

## Authentication

`SessionProvider` (`src/shared/auth/session/`) wraps the app in `src/index.tsx` and talks to the server's better-auth endpoints under `/api/auth`; the session lives in an HTTP-only cookie. `LoginForm` and `SignupForm` are the sign-in and sign-up pages, and `RequireAuth` in `src/AppRoutes.tsx` sends signed-out users to `/login`. Components read the state through `useAuth` or `useSession`.

## Internationalization

User-facing strings live in `src/i18n/locales/{en,es}/common.json`. Use the `useTranslation` hook:

```tsx
const { t } = useTranslation();
<Typography>{t('home.title')}</Typography>;
```

Add new keys to both language files.

## Known Limitations

- **Haptics**: card flip/grade/session-complete vibration (`navigator.vibrate`) works on Android/Chromium mobile browsers only. iOS Safari has never implemented the Vibration API — this is a permanent platform gap, not a bug — and is a no-op there until the app ships a Capacitor native shell (#30), which will use `@capacitor/haptics` instead. Toggle in Profile → Customization.

## Contributing

Issues and pull requests welcome. Commits follow [Conventional Commits](https://www.conventionalcommits.org/) (enforced via commitlint + husky).

## License

[MIT](./LICENSE) © Yusuf Afzal
