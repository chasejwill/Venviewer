# Venviewer Architecture

## Overview

Venviewer is a **modular monolith** organized as a pnpm + Turborepo workspace. There are no microservices, message brokers, or distributed job systems.

```text
venviewer/
├── apps/venviewer/            Standalone Next.js application
└── packages/
    ├── tour-core/             Tour domain, provider abstraction
    ├── tour-ui/               Shared viewer and tour UI
    ├── asset-core/            Asset types, validation, delivery tokens
    └── storage-core/          Provider-agnostic object storage abstraction
```

## Standalone app responsibilities (`apps/venviewer`)

- Management UI (dashboard, create/edit, preview, publishing, embed, asset upload)
- Authentication for management routes
- REST API routes under `/api`
- Public viewer `/view/[slug]` and embed `/embed/[slug]`
- Asset upload pipeline and authorized delivery
- Persistence via Prisma — **SQLite** (development) or **PostgreSQL** (staging/production)

Conceptual domain organization:

```text
src/
  domains/
    auth/             Session, bootstrap user/org
    tours/            (via lib/tour-repository)
    viewer/           Public access rules
    publishing/       Publish/archive checks
    analytics/        Event capture
    assets/           Upload, processing, delivery, native provider foundation
  components/
  app/
  lib/
```

## Package responsibilities

### `tour-core`

Tour types, status helpers, Kuula/Venviewer provider adapters, publish validation, embed code generation, native provider foundation metadata helpers.

### `tour-ui`

Shared `TourViewer`, embed code UI, status badges. Consumes normalized provider output only.

### `asset-core`

Asset and variant types, panorama validation, object key builder, delivery token signing, native tour metadata builders. No storage or database dependencies.

### `storage-core`

`StorageProvider` interface with **local** (development) and **R2** (staging/production) implementations. S3/GCS/Azure remain registered but unimplemented. **Never stores public URLs in the database** — only `storageProvider`, `bucket`, `objectKey`. See [STORAGE.md](./STORAGE.md).

## Asset pipeline (v0.2.1)

```text
Upload request
  → auth + organization check
  → file validation (asset-core)
  → metadata extraction (sharp, temp files)
  → SHA-256 checksum
  → create Asset record (processing)
  → store original (storage provider)
  → generate preview + thumbnail variants
  → store derived assets + AssetVariant records
  → mark processingStatus = ready | failed
  → on failure: cleanup orphaned objects
```

Derived assets are stored as `AssetVariant` records. The original lives on the parent `Asset` record.

## Asset lifecycle

### Processing status

| Status       | Meaning                                        |
| ------------ | ---------------------------------------------- |
| `pending`    | Record created, storage not complete           |
| `processing` | Original stored, derivatives running           |
| `ready`      | Original + variants available                  |
| `failed`     | Processing error recorded in `processingError` |

### Lifecycle status

| Status     | Meaning                                              |
| ---------- | ---------------------------------------------------- |
| `active`   | Normal asset                                         |
| `archived` | Soft-archived; originals preserved; delivery blocked |
| `deleted`  | Marked deleted (internal)                            |

Visibility: `private` (default), `organization`, `public`.

## API boundaries

| Surface                               | Auth                       | Purpose                           |
| ------------------------------------- | -------------------------- | --------------------------------- |
| `/api/tours/*`                        | Session                    | Tour management                   |
| `/api/tours/:id/assets/*`             | Session                    | Asset list + upload               |
| `/api/assets/:id`                     | Session                    | Asset metadata                    |
| `/api/assets/:id/delivery`            | Session or signed token    | Authorized asset delivery         |
| `/api/organizations/storage-usage`    | Session                    | Organization storage totals       |
| `/api/tours/:id/storage-usage`        | Session                    | Tour storage totals               |
| `/api/tours/:id/branding/logo/upload` | Session                    | Upload Venviewer-managed logo     |
| `/api/assets/:id/archive`             | Session                    | Archive asset                     |
| `/api/assets/:id/delete`              | Session                    | Permanently delete asset          |
| `/api/tours/:id/native-metadata`      | Session                    | Native provider foundation lookup |
| `/api/auth/*`                         | Public                     | Login/logout                      |
| `/view/*`, `/embed/*`                 | Public when tour published | Kuula viewer surfaces             |

## Data flow — Kuula tours (unchanged)

Kuula remains the production tour provider. Tour preview, public viewer, and embed continue to use `TourViewer` + Kuula iframe rendering.

## Native provider foundation

`provider = venviewer` is **not production-ready**. The foundation includes:

- Asset storage and metadata per tour
- `lookupNativeTourAssets()` for future scene/manifest support
- `getVenviewerNativeProviderFoundation()` capability flags in `tour-core`

No migration away from Kuula occurs in v0.2.

## Provider independence

Storage communicates through `StorageProvider`. Switching from local disk to R2 requires environment configuration — not application rewrites. See [DEPLOYMENT.md](./DEPLOYMENT.md).

## Future integration boundaries

venOS retired; kept as reference for a future Venview dashboard.

venOS integration remains deferred. When approved, external products should consume Venviewer REST APIs and authorized delivery — not duplicate asset or provider logic.

## Why venOS integration is deferred

venOS retired; kept as reference for a future Venview dashboard.

Venviewer is establishing standalone ownership of tours and now assets before connecting to venOS workflows.
