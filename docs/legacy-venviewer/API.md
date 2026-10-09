# Venviewer API

Base URL is environment-specific (local default: `http://localhost:3100`).

## Authentication

Management endpoints require a valid session cookie (`venviewer_session`) obtained via login.

Public endpoints require no authentication when the target tour is **published**.

### POST `/api/auth/login`

Request:

```json
{
  "email": "admin@venview.local",
  "password": "venviewer"
}
```

Response `200`:

```json
{
  "user": {
    "id": "...",
    "email": "admin@venview.local",
    "name": "Venviewer Admin",
    "organizationId": "..."
  },
  "organizationName": "Venview"
}
```

Errors: `400` missing fields, `401` invalid credentials.

### POST `/api/auth/logout`

Destroys session. Response: `{ "ok": true }`

---

## Tours (management, authenticated)

### GET `/api/tours`

List tours for the authenticated user's organization.

Query parameters:

| Param             | Type                             | Description                               |
| ----------------- | -------------------------------- | ----------------------------------------- |
| `status`          | `draft \| published \| archived` | Filter by status                          |
| `provider`        | string                           | Filter by provider                        |
| `search`          | string                           | Search title/slug/description             |
| `includeArchived` | `true`                           | Include archived tours (default excludes) |

Response: `Tour[]`

### POST `/api/tours`

Create a tour.

Request body (required fields marked):

```json
{
  "title": "Main Floor Tour",
  "slug": "main-floor-tour",
  "description": "Optional",
  "provider": "kuula",
  "providerEmbedUrl": "https://kuula.co/share/collection/...",
  "primaryCtaLabel": "Book a visit",
  "primaryCtaUrl": "https://example.com/book",
  "secondaryCtaLabel": "Contact",
  "secondaryCtaUrl": "https://example.com/contact",
  "showPoweredByVenview": true,
  "branding": {
    "logoUrl": "https://example.com/logo.png",
    "accentColor": "#2563eb"
  }
}
```

Response `201`: `Tour`

Errors: `400` validation failure, `401` unauthenticated.

### GET `/api/tours/:id`

Returns a single tour scoped to the user's organization.

Errors: `404` not found.

### PATCH `/api/tours/:id`

Partial update. Accepts the same fields as create (all optional).

Response: updated `Tour`

### POST `/api/tours/:id/publish`

Publishes a tour after validation (title + valid provider URL required).

Response: updated `Tour` with `status: "published"`.

### POST `/api/tours/:id/unpublish`

Returns tour to `draft`.

### POST `/api/tours/:id/archive`

Sets `status: "archived"` and blocks public access.

### POST `/api/tours/:id/restore`

Restores archived tour to `draft`.

---

## Public tour data

### GET `/api/tours/slug/:slug`

Returns a **sanitized** public tour payload when the tour is published.

Private fields such as `providerMetadata` are omitted.

Errors: `404` for missing, draft, or archived tours.

---

## Analytics

### POST `/api/analytics/events`

Captures an analytics event. Works without external analytics providers configured.

Request:

```json
{
  "tourId": "...",
  "type": "tour_view",
  "surface": "viewer",
  "metadata": { "cta": "primary" }
}
```

Supported `type` values:

- `viewer_load`
- `tour_view`
- `cta_click`
- `embed_load`
- `fullscreen_enter`
- `provider_error`

Errors: `404` if tour unavailable (except preview surface — proposed for future authenticated preview tracking).

---

## Tour object shape

```typescript
{
  id: string;
  organizationId: string | null;
  title: string;
  slug: string;
  description: string | null;
  provider: "kuula" | "venviewer" | "matterport" | "custom";
  providerTourId: string | null;
  providerEmbedUrl: string | null;
  providerMetadata: object | null; // omitted in public responses
  status: "draft" | "published" | "archived";
  publicViewerUrl: string | null;
  embedUrl: string | null;
  primaryCtaLabel: string | null;
  primaryCtaUrl: string | null;
  secondaryCtaLabel: string | null;
  secondaryCtaUrl: string | null;
  showPoweredByVenview: boolean;
  branding: { logoUrl?: string | null; logoAssetId?: string | null; accentColor?: string | null } | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  archivedAt: string | null;
}
```

## Error responses

Errors return JSON:

```json
{ "error": "Human-readable message" }
```

Common status codes: `400`, `401`, `404`.

## Versioning (future)

v0.1 has no API version prefix. Future integrations may introduce `/api/v1/...` without breaking existing standalone clients if needed.

## Proposed endpoints (not implemented)

- `GET /api/organizations/current` — organization profile
- `GET /api/tours/:id/analytics` — aggregated analytics dashboard data

These are documented for boundary planning only.

---

## Assets (v0.2, management authenticated)

### GET `/api/tours/:id/assets`

List panorama assets for a tour in the authenticated organization.

### POST `/api/tours/:id/assets/upload`

Multipart upload (`file` field). Accepts JPEG, PNG, WebP panoramas.

Response `201`: Asset object with variants when processing succeeds.

Errors: `400` validation failure, `401` unauthenticated, `404` tour not found.

### GET `/api/assets/:id`

Returns asset metadata and variant records. Does **not** include permanent public URLs.

### POST `/api/assets/:id/delivery`

Creates a short-lived authorized delivery token.

Response:

```json
{
  "token": "...",
  "expiresInSeconds": 900,
  "deliveryPath": "/api/assets/{id}/delivery?variant=preview&token=..."
}
```

### GET `/api/assets/:id/delivery?variant=preview|thumbnail|original&token=...`

Returns binary asset content. Authorized via session (management), signed token, or published-tour branding rules for logos.

Tokens are HMAC-signed, expire in 15 minutes, and include `assetId`, `variant`, `organizationId`, and `purpose`.

### POST `/api/assets/:id/archive`

Archives an asset (soft). Delivery is blocked; originals are preserved.

### DELETE `/api/assets/:id/delete`

Permanently deletes an asset and all stored variants after organization ownership verification.

### GET `/api/tours/:id/storage-usage`

Returns storage byte totals for the tour (original + variant bytes per asset).

### GET `/api/organizations/storage-usage`

Returns organization-wide storage usage with per-tour breakdown.

### POST `/api/tours/:id/branding/logo/upload`

Multipart upload (`file` field). Accepts PNG, JPEG, WebP, or SVG (max 5 MB). Sets `branding.logoAssetId` on the tour. External `logoUrl` values remain supported for backward compatibility.

Response `201`:

```json
{
  "asset": { "...": "..." },
  "tour": { "...": "..." },
  "deliveryPath": "/api/assets/{id}/delivery?variant=original&token=..."
}
```

### GET `/api/tours/:id/native-metadata`

Returns native Venviewer provider foundation metadata for uploaded assets. **Not production-ready.**

---

## Asset object shape

```typescript
{
  id: string;
  organizationId: string;
  tourId: string | null;
  type: "panorama" | "logo";
  originalFilename: string | null;
  storageProvider: string;
  bucket: string;
  objectKey: string;
  checksum: string | null;
  mimeType: string;
  byteSize: number;
  width: number | null;
  height: number | null;
  processingStatus: "pending" | "processing" | "ready" | "failed";
  lifecycleStatus: "active" | "archived" | "deleted";
  visibility: "private" | "organization" | "public";
  processingError: string | null;
  variants: Array<{
    variant: "preview" | "thumbnail";
    storageProvider: string;
    bucket: string;
    objectKey: string;
    mimeType: string;
    byteSize: number;
    width: number | null;
    height: number | null;
  }>;
  createdAt: string;
  updatedAt: string;
}
```

Permanent object URLs are intentionally absent. Delivery uses authorized routes.

---

## Proposed endpoints (not implemented)

- `GET /api/organizations/current` — organization profile
- `GET /api/tours/:id/analytics` — aggregated analytics dashboard data
- `POST /api/assets` — panorama upload (v0.2)

These are documented for boundary planning only.
