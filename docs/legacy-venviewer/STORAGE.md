# Storage

Venviewer v0.2.1 supports two implemented storage providers:

| Provider                            | Environment         | Status                      |
| ----------------------------------- | ------------------- | --------------------------- |
| `local`                             | Development         | Implemented                 |
| `r2`                                | Staging, production | Implemented                 |
| `s3`, `gcs`, `azure`, `self_hosted` | —                   | Registered, not implemented |

## Abstraction

All asset I/O flows through `@venviewer/storage-core`:

- `putObject`
- `getObject`
- `deleteObject`
- `objectExists`
- `createAuthorizedUrl`

Object keys are provider-neutral:

```text
organizations/{orgId}/tours/{tourId}/assets/{assetId}/{variant}/{filename}
```

## Local provider (development)

```env
VENVIEWER_DEPLOY_ENV=development
STORAGE_PROVIDER=local
STORAGE_LOCAL_ROOT=./storage
STORAGE_BUCKET=venviewer-local
```

Objects are written under `{STORAGE_LOCAL_ROOT}/{bucket}/{objectKey}`.

Authorized delivery for local storage uses application routes with signed query parameters.

## Cloudflare R2 (staging/production)

```env
VENVIEWER_DEPLOY_ENV=staging
STORAGE_PROVIDER=r2
R2_ACCOUNT_ID=...
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
R2_BUCKET=...
R2_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com
R2_REGION=auto
```

R2 uses the S3-compatible API via `@aws-sdk/client-s3`. Buckets and objects remain **private by default**. Delivery uses short-lived presigned URLs or application-mediated delivery.

### Failure behavior

- In `staging` or `production`, `STORAGE_PROVIDER=local` **fails at startup** with a clear error.
- Missing R2 variables when `STORAGE_PROVIDER=r2` fail with `Missing required environment variable: ...`.
- Unimplemented providers throw explicit errors; the app does **not** silently fall back to local storage.

## Asset integrity

Original uploads store a **SHA-256 hex digest** on the `Asset.checksum` field. Derived variants store checksums on `AssetVariant.checksum`.

## Upload pipeline

Current flow (server-mediated):

1. Authenticate and authorize organization/tour access
2. Validate file type, size, and dimensions
3. Compute SHA-256 checksum
4. Create asset record (`processing`)
5. Store original object
6. Generate preview and thumbnail (sharp, temp-file backed)
7. Store variants and mark asset `ready`, or `failed` with cleanup

Partial failures roll back stored objects where possible. Failed uploads never appear as `ready`.

## Future direct upload (not implemented)

Planned flow:

1. Browser requests upload authorization
2. Server validates user, organization, tour, and metadata
3. Browser uploads directly to object storage
4. Server confirms upload and begins processing

See `DirectUploadService` in `@venviewer/asset-core` and `ServerMediatedDirectUploadService` in the app (stub).

## CDN strategy (future)

| Asset class         | Current                           | Future                             |
| ------------------- | --------------------------------- | ---------------------------------- |
| Original panoramas  | Private, app delivery             | Private origin + signed URLs       |
| Previews/thumbnails | Private, token/session delivery   | Cacheable via CDN with signed URLs |
| Branding logos      | Token delivery on published pages | Cacheable with short TTL           |
| Native tour assets  | Experimental, private             | Versioned keys + invalidation      |

Not implemented in v0.2.1 unless naturally available through R2 presigned URLs without weakening authorization.

## Tested panorama limits

| Limit                     | Value                     |
| ------------------------- | ------------------------- |
| Max upload size (default) | 50 MB (`ASSET_MAX_BYTES`) |
| Tested dimensions         | up to 8192 × 4096         |
| Preview max width         | 1920 px                   |
| Thumbnail                 | 400 × 200 cover           |

Processing uses temporary files to avoid holding multiple full-resolution buffers in memory. Unlimited panorama support is **not** claimed.
