# Venviewer Launch Guide (v0.2.2)

Deploy Venviewer as a public Kuula-powered product at **https://tour.venview.co**.

## Public URLs

| Surface             | URL                                                    |
| ------------------- | ------------------------------------------------------ |
| Dashboard           | `https://tour.venview.co`                              |
| Login               | `https://tour.venview.co/login`                        |
| Public viewer       | `https://tour.venview.co/view/[slug]`                  |
| Embed               | `https://tour.venview.co/embed/[slug]`                 |
| Health              | `https://tour.venview.co/api/health`                   |
| Venview integration | `https://tour.venview.co/api/integration/tours/[slug]` |

Set both server and client base URLs:

```env
VENVIEWER_BASE_URL="https://tour.venview.co"
NEXT_PUBLIC_VENVIEWER_BASE_URL="https://tour.venview.co"
VENVIEWER_DEPLOY_ENV="production"
```

After changing the public origin, refresh stored tour URLs:

```bash
# From management API or run refreshTourPublicUrls in a one-off script
```

New tours pick up the origin automatically. Existing tours update on next slug/base-url change or manual refresh.

## Production checklist

1. Provision PostgreSQL and apply migrations: `pnpm db:migrate:deploy`
2. Configure Cloudflare R2 (`STORAGE_PROVIDER=r2`, all `R2_*` vars)
3. Set strong `VENVIEWER_SESSION_SECRET` and `VENVIEWER_DELIVERY_SECRET` (32+ chars)
4. Deploy the Next.js app to your host (Vercel, Railway, etc.)
5. Point `tour.venview.co` DNS to the deployment
6. Verify `/api/health` returns `{ "status": "ok" }`
7. Run R2 smoke test against staging: `pnpm --filter @venviewer/app smoke:r2`
8. Publish a Kuula tour and test viewer + embed on desktop and mobile
9. Test Wix Studio / customer site embed with approved-domain policy
10. Wire Venview listings to `/api/integration/tours/[slug]` (use `tourEnabled` + `venviewerEmbedUrl`)

## Venview (Wix Studio) integration

Venview should store:

```text
venviewerTourId
venviewerSlug
venviewerEmbedUrl
tourEnabled
```

Fetch from:

```http
GET https://tour.venview.co/api/integration/tours/{slug}
```

Response:

```json
{
  "venviewerTourId": "...",
  "venviewerSlug": "main-floor",
  "venviewerEmbedUrl": "https://tour.venview.co/embed/main-floor",
  "venviewerPublicViewerUrl": "https://tour.venview.co/view/main-floor",
  "tourEnabled": true,
  "embedPolicy": "venview_only",
  "provider": "kuula",
  "title": "Main Floor",
  "status": "published"
}
```

Embed Venviewer only when `tourEnabled === true`. Do not embed raw Kuula URLs once Venviewer is live.

## Embed policies

| Policy             | Behavior                                              |
| ------------------ | ----------------------------------------------------- |
| `disabled`         | Embed route shows blocked message                     |
| `any`              | Any site may iframe the tour                          |
| `venview_only`     | Referrer must match `VENVIEWER_VENVIEW_EMBED_DOMAINS` |
| `approved_domains` | Referrer must match tour-specific domain list         |

Configure in Venviewer: **Tour → Install & embed**.

## Customer installation workflow

1. Create tour and connect Kuula URL
2. Configure branding and CTAs
3. **Publish**
4. Set embed policy and approved domains
5. Copy public link or responsive iframe code
6. Paste into customer website or Venview listing

## Monitoring

- **Health:** `GET /api/health` — database + storage checks (no secrets exposed)
- **Analytics events:** viewer_load, embed_load, tour_view, cta_click, fullscreen_enter, provider_error (includes referrer domain)
- **Login rate limit:** 10 attempts / 15 min per IP
- **Analytics rate limit:** 120 events / min per IP

## R2 smoke test

Against staging with real credentials:

```bash
export VENVIEWER_BASE_URL=https://staging.tour.venview.co
export R2_SMOKE_TOUR_ID=your-tour-id
pnpm --filter @venviewer/app smoke:r2
```

Validates upload → delivery → archive → delete.

## Migrations (production)

Do **not** use `db push` in production. Use:

```bash
pnpm db:migrate:deploy
pnpm db:migrate:status
```

Back up PostgreSQL before each deploy. See [DEPLOYMENT.md](./DEPLOYMENT.md) for backup guidance.
