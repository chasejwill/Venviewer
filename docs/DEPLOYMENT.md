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
settings before saving each legacy tour URL; Venviewer does not conceal
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

## Asset storage (Cloudflare R2)

Panorama uploads, private delivery, archive, and delete use object storage.
Local disk is the default when `VENVIEWER_LITE_DEPLOY_ENV` is `development` or
`test`. In production those routes require R2 and fail with a clear error until
it is set. Public pages, embeds, admin login, and tour editing keep working
without R2. Storage is not checked at process startup.

Create a private R2 bucket and an API token that can read and write objects in
that bucket. Do not enable public access on the bucket. Delivery stays on the
application: short-lived HMAC tokens (`VENVIEWER_DELIVERY_SECRET`) or an admin
session. Objects are never given a permanent public URL.

Set these in the host's secret store (Vercel project environment variables for
this app). Do not rename the existing `VENVIEWER_LITE_*` variables.

Required before asset routes work in production:

| Variable                    | Purpose                                                  |
| --------------------------- | -------------------------------------------------------- |
| `STORAGE_PROVIDER`          | `r2`                                                     |
| `R2_ACCOUNT_ID`             | Cloudflare account id                                    |
| `R2_ACCESS_KEY_ID`          | R2 API token access key                                  |
| `R2_SECRET_ACCESS_KEY`      | R2 API token secret                                      |
| `R2_BUCKET`                 | Private bucket name                                      |
| `R2_ENDPOINT`               | `https://<account-id>.r2.cloudflarestorage.com`          |
| `VENVIEWER_DELIVERY_SECRET` | Random string, at least 32 characters, not a placeholder |

Optional:

| Variable             | Purpose                                                       |
| -------------------- | ------------------------------------------------------------- |
| `R2_REGION`          | Defaults to `auto`                                            |
| `ASSET_MAX_BYTES`    | Upload ceiling in bytes. Defaults to 52428800 (50 MB)         |
| `STORAGE_LOCAL_ROOT` | Development only. Defaults to `./storage`                     |
| `STORAGE_BUCKET`     | Development bucket folder name. Defaults to `venviewer-local` |

`GET /api/health` pings the database and probes storage. It reports
`storage: "not_configured"` when production R2 settings are missing, and it
does not include credentials, bucket names, or endpoints. A database failure
returns HTTP 503. A storage gap does not, so the existing site can stay up
while assets are still being wired.

Vercel serverless request bodies are smaller than the 50 MB application limit
on some plans. The upload route enforces `ASSET_MAX_BYTES`, but the platform
may reject the request first. This release does not change Vercel project
settings. Raise the platform body limit, or keep panoramas under that limit,
before relying on large uploads.

## Going live with this release

1. Back up the production database. Do not run `prisma migrate dev` or the
   example seed against it.
2. Set the production variables above in Vercel. Leave `VENVIEWER_LITE_*`
   unchanged apart from values you already rotate on purpose.
3. Apply the new migration once, before new instances serve traffic:

   ```sh
   pnpm db:migrate:deploy
   ```

   The migration only adds columns and tables. Existing tours get
   `embedPolicy = 'any'`, so current embeds keep framing from any site. New
   tours default to `venview_only` (venview.co, www.venview.co, and
   tour.venview.co). `os.venview.co` is not an allowed host.

4. Deploy the application with the existing install and build commands
   (`pnpm install`, `pnpm build`). Do not change the Vercel project settings
   as part of this release.
5. Open `GET /api/health`. Expect `database: "ok"`. Expect `storage: "ok"`
   after R2 is set, or `storage: "not_configured"` until then.
6. Sign in, upload a small panorama on a tour, and confirm the thumbnail loads
   only while the admin session is present. Archive and delete from the same
   panel.
7. Confirm an existing published tour still embeds. New tours embed on Venview
   hosts until an admin changes the policy on the tour page.
