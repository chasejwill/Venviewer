# Release notes

## 1.1.0 — 2026-10-06

Native runtime foundation:

- Tours record a provider: `legacy-kuula` or `venviewer-native`
- Existing Kuula tours keep their iframe viewer and public URLs
- Native tours store scenes and connections without a Kuula URL
- Shared viewer renders native scenes with a WebGL panorama runtime
- Viewer shell adds design tokens, loading, error, retry, and fullscreen
- Published panorama files are served from private storage only when a native
  scene references them
- Creating a tour in admin still saves a legacy Kuula tour

## 1.0.1 — 2026-08-01

- Centered responsive gradient title header on public tour pages
- Full-viewport public and embed viewers without fixed iframe height or lower
  wrapper bar
- Canonical public metadata, useful descriptions, and draft `noindex`
- Explicit iframe ownership guidance: Kuula UI is configured through official
  Kuula export/share settings and is not concealed by Venviewer
- Expanded route, presentation, iframe, metadata, and framing tests

## 1.0.0 — 2026-07-31

Initial Venviewer release:

- Published and draft Kuula tours with validated unique slugs
- Public and embeddable responsive viewers
- Single-admin authentication and complete tour management
- Signed expiring sessions, CSRF protection, login limiting, CSP, and security
  headers
- SQLite local development and documented PostgreSQL production deployment
- Automated validation, authorization, route, session, and environment tests
