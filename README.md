# Venviewer

Venviewer publishes virtual tours on Venviewer URLs. Legacy tours still
embed a Kuula share. Native tours use Venviewer's panorama runtime and scene
records, and they do not require a Kuula URL. Version 1.1.0 adds that native
path. Existing published Kuula tours stay on the legacy viewer.

The legacy public route presents a Venviewer title header above the
cross-origin Kuula viewer; the embed route contains only the viewer. Kuula
branding and in-player UI must be configured with official Kuula export/share
settings and saved in the tour's stored URL. Venviewer does not conceal or
remove Kuula-owned UI. Native tours render in a Venviewer canvas instead.

## Quick start

Requirements: Node.js 22+, pnpm 11+, and SQLite.

```sh
cp .env.example .env
pnpm install
# Pipe your password without storing plaintext in the application:
printf '%s' 'your-long-password' | pnpm auth:hash-password
# Replace every placeholder in .env, including the generated hash
pnpm db:migrate
pnpm dev
```

Open `http://localhost:3000/admin/login`. Tours remain unavailable on public and
embed routes until published. The optional example is added with
`pnpm db:seed`; it is always created as a draft.

## Commands

- `pnpm dev` — run the development server
- `pnpm db:migrate` — apply/create local SQLite migrations
- `pnpm db:push` / `pnpm db:generate` — synchronize development/generate client
- `pnpm db:migrate:deploy` — deploy production PostgreSQL migrations
- `pnpm db:migrate:deploy:sqlite` — deploy SQLite migrations when needed
- `pnpm db:seed` — add the development-only Falls of the Ohio draft
- `pnpm test` — run tests
- `pnpm verify` — formatting, lint, types, tests, and production build
- `pnpm build` — production PostgreSQL build

Production PostgreSQL deployment is documented in
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md). See
[docs/LOCAL_DEVELOPMENT.md](docs/LOCAL_DEVELOPMENT.md) for setup details and
[docs/SECURITY.md](docs/SECURITY.md) before exposing the application.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Local development](docs/LOCAL_DEVELOPMENT.md)
- [Deployment](docs/DEPLOYMENT.md)
- [Security](docs/SECURITY.md)
- [Release process](docs/RELEASE_PROCESS.md)
- [Release notes](RELEASE_NOTES.md)
