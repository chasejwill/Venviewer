# Legacy Venviewer reference

These files are reference material copied from the retired `chasejwill/venviewer` monorepo. They are not the live docs for this app. The current architecture, deployment, and security docs stay in `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md`, and `docs/SECURITY.md`.

Do not apply `prisma/schema.prisma` or `prisma/schema.postgresql.prisma` in this folder. Those files describe the retired `Tour` shape and would wipe this app's `Tour`, `Scene`, and `SceneConnection` models. `env.example` documents the retired app's names. This app still uses `VENVIEWER_LITE_*` for the site. Asset routes also read `STORAGE_*`, `R2_*`, `VENVIEWER_DELIVERY_SECRET`, and `ASSET_MAX_BYTES`. They do not read `VENVIEWER_DEPLOY_ENV`, `VENVIEWER_BASE_URL`, or `os.venview.co`.

## venOS retired; kept as reference for a future Venview dashboard

venOS is no longer live. The ported docs keep the old venOS plans, and `env.example` still lists `os.venview.co`, so they can inform a later dashboard on the Venview website. That material is not a build order for this app. This pull request does not add venOS runtime code, venOS configuration, or new environment variables.

- `VISION.md`, `ROADMAP.md`, and `ARCHITECTURE.md` keep the original venOS sections. Each one is marked **venOS retired; kept as reference for a future Venview dashboard**.
- `env.example` keeps `os.venview.co` with the same mark. This app does not read that file.

The integration payload and the `venview_only` embed policy stay because Venview listings on venview.co can use them. They do not call venOS. The domain list is an argument. Nothing in `lib/` hardcodes `os.venview.co`.

## Stale relative to this app

Read these as a backlog and a design record. Several statements describe the monorepo before this app shipped a native viewer.

- `PROVIDER_SYSTEM.md` says scene records and the native viewer runtime are "Not yet", and that `provider = venviewer` is only a foundation stub. This app already stores `Scene` and `SceneConnection` and renders a WebGL panorama.
- `ROADMAP.md` lists scenes, connections, and a native panorama runtime as proposed v0.3–v0.4 work. That work already shipped here. Keep the file as history, not as a build order. Its guiding line that Kuula remains the only production runtime is stale for native tours.
- Public and embed paths in these docs use `/view/[slug]`. This app publishes a tour at `/[slug]` and embeds it at `/embed/[slug]`.
- `API.md` describes tour CRUD as HTTP routes. This app uses server actions for tour edits. Upload, private delivery, archive, delete, `POST /api/analytics/events`, and `GET /api/integration/tours/[slug]` are implemented. Organization profiles, storage-usage rollups, and logo upload are not.
- `ARCHITECTURE.md` describes a private object-storage pipeline. This app stores native panorama files on disk under `storage/panoramas`.
