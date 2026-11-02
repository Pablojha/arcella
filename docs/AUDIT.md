# Arcella audit — November 2026

A review of the whole project before the production hardening pass. Findings are ordered by priority. Status is kept up to date in [`TODO.md`](../TODO.md).

## The project at a glance

| Area | What is there |
|---|---|
| Frontend | React 19, Vite 7, Tailwind 4, framer-motion, React Router 7. A PWA with a hand-written service worker, deployed on Vercel. |
| Backend | Express 5 (Node ≥ 20.12), Mongoose 8, Socket.IO 4, zod validation, Cloudinary uploads and Web Push. Deployed on Render. |
| Database | MongoDB Atlas (M0). The app user has `readWrite` on one database, and the access list allows only Render's outbound IP ranges. |
| Auth | Email and password. A signed JWT (30 days) is sent as a Bearer token, so cookies are not involved and CSRF does not apply. Sessions end when the password changes. Admin status comes from the `ADMIN_EMAIL` list. |
| Tests | 17 end-to-end API tests (`node:test`, real MongoDB), plus browser checks for every feature that were run during development. |

## What was already done well

- Every route validates input with zod, and unknown fields are stripped, so there is no mass assignment and no NoSQL operator injection.
- Ownership and role checks exist on every update and delete: owners, the question's asker, mentor/mentee, college admins and site admins.
- Helmet, explicit CORS origins, a 1 MB JSON limit, per-IP auth limits and per-account write limits are in place, and errors are masked in production.
- Uploads are restricted by type and size with random file names. SVG and HTML are refused.
- The frontend uses no `dangerouslySetInnerHTML` or `eval`, and there are no open redirects.
- Git history: a scan of all 12 commits found **no real credentials**, only documentation placeholders. Only `.env.example` files are tracked.

## Findings

### Critical
1. **Admin takeover through an unverified email.** Production has no email provider yet, so registration marks every address as "verified" and grants admin to anyone who registers with an `ADMIN_EMAIL` address. If that address isn't registered yet, anyone can claim it. *Fix: admin rights require an email proven with a one-time code, and `emailVerified` means "proven", not "not required".*

### High
2. **zod < 4.6.6 (GHSA-mrhx-c7xc-m3w5)**: memory exhaustion while validating oversized arrays. The 1 MB body limit bounds it, but it is still a known advisory. *Fix: upgrade to zod 4.*
3. **Password hashing at bcrypt cost 10**, the minimum acceptable today. *Fix: Argon2id (OWASP parameters), with existing bcrypt hashes upgraded at the next sign-in. Nobody has to reset.*
4. **No security headers on the website** (Vercel): no CSP, framing protection, Referrer-Policy or Permissions-Policy. An inline script blocks a strict CSP. *Fix: headers in `vercel.json`, and move the inline theme script to a file.*

### Medium
5. **No Terms, Cookie Policy or Refund Policy pages, and no sign-up consent.** The privacy page doesn't yet cover push notifications, chat media, browser storage or third-party services.
6. **SEO gaps**: no `robots.txt`, `sitemap.xml`, canonical URLs or per-page descriptions. The social preview image is a relative-URL square icon.
7. **Caching**: hashed assets aren't marked immutable, so repeat visits re-validate every file.
8. **Accessibility** has never had an automated WCAG audit.
9. **No root `.gitignore`**, and the per-package ones only ignore `.env` (not `.env.production` or similar).
10. **External links** (firm, job, event, profile websites) rely only on server validation. *Fix: also check at render time.*
11. **Dependencies**: patch updates for `express-rate-limit`, `mongoose` and `@vitejs/plugin-react`. Frontend advisories (glob, minimatch, rimraf) are inside `@capacitor/cli`, a development-only tool that never reaches the website bundle.

### Low / documentation
12. JWT verification doesn't pin the algorithm (safe in jsonwebtoken 9, but pinning is better).
13. No CI: tests run only locally.
14. The docs don't cover security, the API surface, testing, backups or a changelog.
15. **Atlas M0 has no automated backups.** This needs a documented manual backup routine, or an upgrade.

## Known limitations (by design, documented rather than changed)
- Uploaded media is served from public, unguessable Cloudinary URLs. Signed URLs would mean re-architecting media delivery.
- Sessions use Bearer tokens in `localStorage` rather than httpOnly cookies. The website and API are on different sites (`vercel.app` and `onrender.com`), where cookies would be third-party and are blocked by modern browsers. A strict CSP is the XSS mitigation.
- Render's free plan sleeps after 15 idle minutes. A scheduled workflow keeps it awake during Indian daytime.
