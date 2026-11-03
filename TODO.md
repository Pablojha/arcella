# TODO — production hardening pass

Started 3 November 2026 from tag `v1.0-pre-hardening` (the live version before this work). Findings: [`docs/AUDIT.md`](docs/AUDIT.md).

## Security
- [x] Admin rights only for emails proven with a code; no re-registering over accounts while codes are off
- [x] zod 4 upgrade (GHSA-mrhx-c7xc-m3w5): backend audit now clean
- [x] Argon2id password hashing, upgrading bcrypt hashes at sign-in (tested)
- [x] Pin the JWT algorithm
- [x] Website security headers (CSP, framing, referrer, permissions, HSTS); inline script moved to a file. `vite preview` serves the same headers, and every page and feature passed under them.
- [x] Root `.gitignore`; env patterns
- [x] Render-time check for external links
- [x] Patch updates (express-rate-limit, mongoose, @vitejs/plugin-react)

## Legal and privacy
- [x] Terms, Cookie Policy and Refund Policy pages; Privacy updated (chats, notifications, storage, third parties, retention)
- [x] Footer links on public pages and in the app; policy buttons in Settings
- [x] Consent on sign-up (checkbox, enforced by the API, recorded as `termsAcceptedAt`)
- [x] Cookie notice and Cookie settings (essential only by default; preferences across visits only with consent)
- [ ] **Blocked on the owner:** operator name, public contact email, postal address/city, governing law, and whether paid features are planned. Fill them in `frontend/src/config/site.js` and `VITE_CONTACT_EMAIL`.

## Accessibility, SEO, performance
- [x] axe-core WCAG 2.2 AA scan of every route: 6 rule failures fixed, now 0 (light and dark, phone and desktop)
- [x] Per-page descriptions and canonical URLs; social image; JSON-LD; robots.txt; sitemap.xml; noindex on 404 and reset
- [x] Immutable caching for hashed assets; vendor chunks; splash only for the installed app; landing page bundled
- [ ] Lighthouse after deploy (baseline: performance 92/91, accessibility 100, best practices 100, SEO 91/92; largest paint 3.1 s)

## UI and responsiveness
- [x] Sweep every route at 320, 375, 768 and 1280 px in light and dark: no overflow or runtime errors. The Playwright suite covers all 10 widths.
- [x] Consistent public footer and legal page layout; cookie table becomes cards on phones

## Tests and docs
- [x] Playwright suite in `e2e/` (public pages, cookie notice, auth journeys, access control, 10 widths, WCAG, links): 30 passed, 4 skipped by design. It caught a real bug (logout landing on the login page), now fixed.
- [x] CI workflow (API tests + audit, website build + audit, Playwright)
- [x] README, SECURITY.md, docs/API.md, CHANGELOG.md

## Deploy
- [ ] Push and verify Render and Vercel (authorized: the owner asked to deploy everywhere)
