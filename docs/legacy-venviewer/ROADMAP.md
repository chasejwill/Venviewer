# Venviewer Roadmap

## v0.1.0 — Standalone Kuula Tour Platform (complete)

- [x] Tour records with provider abstraction
- [x] Kuula provider adapter
- [x] Tour dashboard, create/edit/archive
- [x] Shared preview + public viewer + embed
- [x] Publishing controls and branding/CTA controls
- [x] Basic authentication and organization structure
- [x] Analytics-ready event capture

## v0.2.0 — Asset and Hosting Foundation (complete)

- [x] Dedicated asset domain (`asset-core`, `domains/assets`)
- [x] Provider-agnostic storage abstraction (`storage-core`)
- [x] Panorama upload pipeline with validation
- [x] Original preservation + preview/thumbnail derivatives
- [x] Asset records scoped to organization and tour
- [x] Authorized delivery via session or signed token
- [x] Native `venviewer` provider foundation (not production)
- [x] Kuula unchanged as production provider

## v0.2.1 — Production Storage and Delivery (complete)

- [x] Cloudflare R2 storage provider
- [x] PostgreSQL schema support
- [x] Session hardening and delivery token improvements
- [x] Upload rollback/cleanup, asset lifecycle, checksums
- [x] Storage usage tracking and branding logo uploads

## v0.2.2 — Production Launch & Embed Readiness (complete)

- [x] Production domain configuration (`tour.venview.co`)
- [x] Checked-in Prisma migrations + `migrate deploy`
- [x] R2 staging smoke test script
- [x] Public viewer polish (loading, errors, fullscreen, accessibility)
- [x] Responsive embed code with lazy loading
- [x] Embed access policies and domain enforcement
- [x] Venview integration API
- [x] Customer install workflow in dashboard
- [x] Analytics with referrer domain + deduplicated unique views
- [x] Health endpoint, rate limiting, security headers

## v0.3.0 — Native Scene & Manifest Foundation (proposed)

- Scene records and ordering
- Panorama asset assignment per scene
- Starting scene selection
- Initial yaw and pitch
- Draft manifest

## v0.3.1 — Scene Connections & Hotspot Foundation (proposed)

- Scene linking
- Hotspot data model and API

## v0.4.0 — Native Panorama Viewer Runtime (proposed)

- Replace Kuula iframe for native tours

## v0.4.1 — Visual Tour Editor (proposed)

## v0.5.0 — Native Publishing and Embeds (proposed)

## Later — venOS integration (requires explicit approval)

venOS retired; kept as reference for a future Venview dashboard.

## Guiding principle

Kuula remains the production tour runtime until native Venviewer hosting is explicitly approved and complete.
