# Deployment

Run the application behind HTTPS with Node.js 22+. Set all variables from
`.env.example`; use a managed secret store and a PostgreSQL connection URL for
production.

Set `VENVIEWER_LITE_DEPLOY_ENV=production`,
`VENVIEWER_LITE_BASE_URL` to the canonical HTTPS origin, and provide a valid
email, bcrypt password hash, and random session secret. Startup rejects missing,
malformed, or documented placeholder values.

Public tour canonical metadata is generated from
`VENVIEWER_LITE_BASE_URL`, so update it whenever the production origin changes.
Configure branding and player controls with official Kuula export/share
settings before saving each legacy tour URL; Venviewer Lite does not conceal
Kuula-owned UI. Native tours do not use a Kuula URL. Their panorama files
belong in `storage/panoramas` and are served only for published native scenes.

## PostgreSQL migrations

The default `prisma/schema.prisma` and `prisma/migrations` tree are PostgreSQL,
so standard Vercel commands are sufficient:

```sh
pnpm install
pnpm db:migrate:deploy
pnpm build
pnpm start
```

Set the Vercel install command to `pnpm install` and build command to
`pnpm build`. The checked-in default migration is PostgreSQL SQL and does not
rely on converting SQLite migrations. Local commands explicitly use
`prisma/sqlite/schema.prisma`.

Apply migrations once per release before starting new application instances.
Back up the database first. Never run `prisma migrate dev` or the example seed
in production.

The in-memory login limiter is per application process. For horizontally scaled
or serverless deployments, enforce an additional shared rate limit at the
reverse proxy/platform edge.
