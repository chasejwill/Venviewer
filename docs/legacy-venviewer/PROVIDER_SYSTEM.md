# Provider System

Venviewer treats every tour as provider-backed. The generic tour domain never depends directly on Kuula-specific logic.

## Current provider

```text
kuula
```

Kuula continues to build and host the actual virtual tour runtime in v0.1. Venviewer stores the reference URL, normalizes embed behavior, and wraps it in Venview-owned viewer surfaces.

## Implemented storage providers (v0.2.1)

```text
local   — development filesystem storage
r2      — Cloudflare R2 (staging/production)
```

Other registered providers (`s3`, `gcs`, `azure`, `self_hosted`) throw explicit "not implemented" errors.

See [STORAGE.md](./STORAGE.md) for configuration and [DEPLOYMENT.md](./DEPLOYMENT.md) for environment setup.

## Future tour providers (registered, not all active)

```text
venviewer
matterport
custom
```

Stubs exist in the provider registry for future expansion. Only Kuula is user-selectable in v0.1 management UI.

## Provider interface responsibilities

Each provider implements:

| Method                              | Responsibility                                  |
| ----------------------------------- | ----------------------------------------------- |
| `validateEmbedUrl(url)`             | Reject invalid source URLs before save/publish  |
| `extractTourId(url)`                | Derive provider-native identifier when possible |
| `normalizeEmbedUrl(url, metadata?)` | Persist a canonical provider URL                |
| `getEmbedIframeSrc(url, metadata?)` | Resolve iframe `src` for the viewer             |

The shared viewer calls `getProviderRenderConfig(tour)` in `tour-core`, which delegates to the active provider adapter.

## Provider-specific metadata

Stored on the tour as `providerMetadata` (JSON). Kuula may store optional `kuulaParams` for iframe query customization.

Management UI does not expose raw metadata editing in v0.1 — the Kuula adapter derives what it needs from the user-supplied share URL.

## URL validation

Validation runs on create, update, and publish via `validateProviderSourceUrl()`. Invalid URLs block persistence with a clear error message.

Example valid Kuula URL:

```text
https://kuula.co/share/collection/7lXhF
```

## Embed and preview rendering

All surfaces use the same path:

1. Load tour record
2. Resolve provider from `tour.provider`
3. Provider adapter returns normalized iframe source
4. `TourViewer` renders iframe + CTAs + branding

There is no separate preview renderer, public renderer, and embed renderer — only layout/mode differences.

## Native Venviewer provider foundation (v0.2)

`provider = venviewer` exists as a **foundation stub**, not a production provider.

Kuula remains the only production tour runtime. Native provider foundation includes:

| Capability            | v0.2 status |
| --------------------- | ----------- |
| Asset lookup per tour | Implemented |
| Native metadata API   | Implemented |
| Scene records         | Not yet     |
| Native viewer runtime | Not yet     |
| Kuula migration       | Not yet     |

### Native metadata flow

1. Panoramas upload to Venviewer storage (asset domain)
2. `GET /api/tours/:id/native-metadata` returns `NativeTourMetadata`
3. Future `venviewer` provider will consume assets + scenes to render tours

`getVenviewerNativeProviderFoundation()` in `tour-core` exposes capability flags (`productionReady: false`).

## Storage independence

Asset blobs are stored via `StorageProvider` (`storage-core`). The database stores object references only:

```text
storageProvider + bucket + objectKey
```

Delivery uses signed tokens or authenticated sessions — never persisted public URLs.

## Future Venviewer-hosted tours

When the `venviewer` provider replaces Kuula for a tour:

- The tour record shape stays the same
- `providerEmbedUrl` will point to Venviewer-hosted manifest or viewer entry
- Public routes (`/view/[slug]`, `/embed/[slug]`) remain unchanged
- The viewer continues to consume normalized provider output

This allows gradual migration tour-by-tour.

## Separation from UI

Provider adapters live in `packages/tour-core/src/providers.ts`.

`tour-ui` must not:

- Parse Kuula URLs
- Hardcode Kuula hostnames
- Branch on provider-specific behavior beyond consuming normalized render config and branding fields

Management forms collect a provider source URL; the adapter handles the rest.

## Adding a provider later

1. Implement `TourProvider` in `tour-core`
2. Register in the provider map
3. Enable selection in management UI when ready
4. Document validation rules and metadata shape in this file

No database migration is required for new provider types — `provider` is a string field with registry validation.
