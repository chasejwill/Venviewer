# Deployment

## Environments

| Environment | `VENVIEWER_DEPLOY_ENV` | Database   | Storage |
| ----------- | ---------------------- | ---------- | ------- |
| Development | `development`          | SQLite     | `local` |
| Staging     | `staging`              | PostgreSQL | `r2`    |
| Production  | `production`           | PostgreSQL | `r2`    |

Security behavior is driven by explicit configuration (`VENVIEWER_DEPLOY_ENV`, `STORAGE_PROVIDER`), not solely by `NODE_ENV`.

## Local development

```bash
pnpm install
cp apps/venviewer/.env.example apps/venviewer/.env
pnpm db:push
pnpm dev
```

Default login: `admin@venview.local` / `venviewer`

## PostgreSQL (staging/production)

1. Provision a PostgreSQL database.
2. Set `DATABASE_URL`:

```env
DATABASE_URL="postgresql://user:password@host:5432/venviewer?schema=public"
```

3. Apply schema:

```bash
pnpm --filter @venviewer/app db:generate:postgres
pnpm --filter @venviewer/app db:push:postgres
```

For production, prefer `prisma migrate deploy` once migration files are introduced. v0.2.1 documents `db push` for initial staging setup.

### Migration workflow

- **Local SQLite**: `pnpm db:push` — safe for dev; does not destroy data unless columns are removed.
- **Staging**: apply `schema.postgresql.prisma` via `db:push:postgres` or migrate.
- **Production**: take a backup before schema changes; run migrations during a maintenance window; verify rollback plan.

## Staging deployment checklist

```env
VENVIEWER_DEPLOY_ENV=staging
DATABASE_URL=postgresql://...
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=...
R2_ENDPOINT=...
R2_REGION=auto
VENVIEWER_SESSION_SECRET=<strong-random>
VENVIEWER_DELIVERY_SECRET=<strong-random>
VENVIEWER_BASE_URL=https://staging.example.com
NEXT_PUBLIC_VENVIEWER_BASE_URL=https://staging.example.com
```

Build and start:

```bash
pnpm install
pnpm db:generate:postgres
pnpm db:push:postgres
pnpm build
pnpm --filter @venviewer/app start
```

## Production deployment checklist

Same as staging with `VENVIEWER_DEPLOY_ENV=production`. Additional precautions:

- Use unique secrets for `VENVIEWER_SESSION_SECRET` and `VENVIEWER_DELIVERY_SECRET`
- Restrict R2 credentials to the Venviewer bucket
- Keep the R2 bucket private (no public ACL)
- Enable HTTPS and secure cookies (automatic when `NODE_ENV=production`)
- Monitor failed asset uploads and storage errors

## Required secrets

| Variable                    | Purpose                                        |
| --------------------------- | ---------------------------------------------- |
| `DATABASE_URL`              | Prisma database connection                     |
| `VENVIEWER_SESSION_SECRET`  | iron-session encryption (min 32 chars)         |
| `VENVIEWER_DELIVERY_SECRET` | HMAC asset delivery tokens                     |
| `R2_*`                      | Cloudflare R2 credentials (staging/production) |

Never commit live credentials.

## Incomplete configuration

| Condition                                     | Behavior                                     |
| --------------------------------------------- | -------------------------------------------- |
| Staging/production + `STORAGE_PROVIDER=local` | Application throws at storage initialization |
| `STORAGE_PROVIDER=r2` + missing R2 vars       | Clear error naming the missing variable      |
| Invalid session cookie                        | Middleware redirects to login or returns 401 |
| Expired/deleted user session                  | API destroys session and returns 401         |
