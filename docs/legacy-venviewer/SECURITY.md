# Security

## Session authentication

Management routes require a **valid iron-session**, not merely cookie presence.

Middleware validates:

- Session decryption succeeds
- `isLoggedIn` is true
- User id, email, and organization id are present

API routes additionally:

- Verify the user exists in the database
- Confirm organization membership matches the session
- Destroy invalid sessions

Public routes remain public only for published tour viewing (`/view/*`, `/embed/*`, public tour API).

## Authorization layers

| Layer           | Responsibility                          |
| --------------- | --------------------------------------- |
| Middleware      | Session shape and presence              |
| API routes      | Organization/tour/asset ownership       |
| Delivery routes | Token, session, or published-tour rules |

Middleware is **not** the only security boundary. Each API route performs its own authorization checks.

## Asset delivery tokens

HMAC-SHA256 signed tokens include:

- `assetId`
- `variant`
- `organizationId`
- `expiresAt`
- `purpose` (`management`, `branding`, `viewer`)

Properties:

- 15-minute TTL
- Constant-time signature comparison
- Scoped to asset, variant, and organization
- Invalid, expired, or tampered tokens are rejected
- Archived or non-ready assets are not delivered

## Storage security

- R2 buckets and objects are private by default
- Presigned URLs expire (default 900 seconds)
- Storage errors are normalized; credentials and internal paths are not exposed to clients
- Production cannot use local filesystem storage

## Asset lifecycle

- Archive: soft state; originals preserved; delivery blocked
- Permanent delete: requires authentication, organization ownership, removes all variants and originals
- Failed uploads: marked `failed`, partial objects cleaned up

## Checksums

SHA-256 checksums on originals support integrity verification and future duplicate detection. Duplicate rejection is not automatic in v0.2.1.

## Native provider

The `venviewer` tour provider remains `productionReady: false`. Incomplete native tours cannot be published as production equivalents to Kuula tours.
