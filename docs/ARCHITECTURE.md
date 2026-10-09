# Architecture

Venviewer is one Next.js App Router application. Server components read
Prisma directly; server actions own every mutation. Client components cover
form state, clipboard interaction, and the panorama viewer runtime.

Tours have a provider. `legacy-kuula` keeps the existing share URL and iframe.
`venviewer-native` stores scenes and connections and does not store a Kuula
URL. The shared `TourViewer` selects the renderer. Public and embed routes both
use it. Native scene records use same-origin asset ids such as
`/panoramas/lobby.jpg`. The spatial model can also describe destinations,
interaction regions, routes, and navigation session state; pathfinding and
guided playback are not implemented yet.

## Routes

- `/[slug]` publishes a tour. Legacy tours keep the centered title header and
  Kuula iframe. Native tours fill the viewport with the panorama shell.
- `/embed/[slug]` renders only the viewer and is embeddable. Native embeds use
  the same runtime as the public page.
- `/panoramas/[...path]` serves a native panorama file only when a published
  native scene references that asset id.
- `/admin/login` authenticates the configured administrator email against its
  bcrypt password hash.
- `/admin/tours`, `/admin/tours/new`, and `/admin/tours/[id]` require a valid
  server-checked session. `/admin` redirects to the list. The admin form still
  creates legacy Kuula tours. Native scene authoring is not in this release.

PostgreSQL is the production database in `prisma/schema.prisma`. Local SQLite
schema and migrations live under `prisma/sqlite`. No user or session records
are stored. Panorama bytes live under `storage/panoramas`, outside `public/`.

## Request boundaries

`proxy.ts` gives each browser a CSRF token, adds security headers, and redirects
unauthenticated admin document requests before rendering. Pages and actions
still verify authorization; actions also verify the token and configured-base-
URL origin. Sessions are signed, expiring, HttpOnly cookies. Public and embed
metadata resolve unknown tours through Next.js `notFound` before document
streaming. Public metadata uses `VENVIEWER_LITE_BASE_URL` for its canonical URL;
drafts are marked `noindex` and return a clear inaccessible state without a
player.

Legacy Kuula tours remain cross-origin iframes. Venviewer neither inspects
nor conceals content inside that frame. Configure Kuula-owned UI through
official Kuula export/share settings, then store the resulting share URL on the
tour. Native tours render on a Venviewer-owned WebGL canvas. Camera yaw, pitch,
field of view, texture residency, and interruption live behind that runtime
rather than in Kuula types.
