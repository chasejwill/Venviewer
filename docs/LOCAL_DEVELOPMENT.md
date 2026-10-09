# Local development

Install Node.js 22+ and pnpm 11+, then:

```sh
cp .env.example .env
pnpm install
printf '%s' 'your-long-password' | pnpm auth:hash-password
# Put the resulting bcrypt hash in .env and replace every other placeholder.
pnpm db:migrate
pnpm dev
```

Set `VENVIEWER_LITE_BASE_URL=http://localhost:3000`,
`VENVIEWER_LITE_DEPLOY_ENV=development`, a valid administrator email, the
generated hash, and a random session secret of at least 32 characters. One way
to generate the secret is `openssl rand -base64 48`. The hash command has no
default password and reads standard input. Do not commit `.env`.

Set `DATABASE_URL=file:./dev.db`; relative SQLite paths resolve beside
`prisma/sqlite/schema.prisma`, and database variants are ignored by Git. All
local database and development scripts explicitly generate the SQLite client.
Run `pnpm db:migrate` after schema changes. `pnpm db:seed` optionally creates
the Falls of the Ohio draft and is blocked when `NODE_ENV=production`.

Use `pnpm verify` before release. It checks formatting, lint, strict TypeScript,
tests, Prisma generation, and a production build.

Native panorama files are not placed in `public/`. For a published native scene
whose asset id is `/panoramas/lobby.jpg`, store the image at
`storage/panoramas/lobby.jpg`. The delivery route returns it only while that
published scene still references the id. Admin tour creation still saves legacy
Kuula tours; native scene authoring is not part of this release.
