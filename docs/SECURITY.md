# Security

- The admin email, bcrypt password hash, and session signing secret come only
  from environment variables. Plaintext passwords are never configured.
- Session cookies are HMAC-signed, expire after eight hours, and use HttpOnly,
  SameSite=Strict, Path=/, and Secure in production.
- Every mutation checks the session on the server. CSRF defenses combine a
  per-browser token, configured-base-URL origin validation, SameSite cookies,
  and server actions. Vercel previews are accepted only for constrained
  HTTPS `*.vercel.app` forwarded hosts at the Vercel edge.
- Login failures are limited to five per source address per 15-minute window in
  each process. Add edge/shared limiting for multi-instance production.
- Zod validates titles, slugs, and HTTPS Kuula hosts and paths. Reserved route
  slugs cannot be saved; the database enforces slug uniqueness.
- CSP limits frames to exact `kuula.co` and `www.kuula.co` origins for legacy
  tours. Native tours do not add a third-party frame. Other security headers
  disable MIME sniffing and sensitive browser capabilities.
- Native panorama files are read from `storage/panoramas` and are served only
  when a published `venviewer-native` scene references the asset id. The
  resolver rejects identities that leave that directory. A draft reference does
  not make the file downloadable.
- All ordinary pages deny framing. `/embed/[slug]` deliberately allows framing
  from any site; drafts show an inaccessible state without a Kuula iframe.
- The Kuula iframe is borderless and fully visible. Venviewer does not use
  masks, clipping, blur, overlays, or URL rewriting to conceal Kuula branding
  or controls. Configure those through official Kuula export/share settings and
  store the resulting validated URL.

Use HTTPS, rotate credentials when exposure is suspected, patch dependencies,
and restrict access to deployment secrets and database backups. There is no
password reset workflow: update the environment credentials and restart.
