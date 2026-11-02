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
- [ ] Terms, Cookie Policy and Refund Policy pages; Privacy updated (push, chats, storage, third parties)
- [ ] Footer links on public pages and in the app
- [ ] Consent on sign-up
- [ ] Browser-storage notice with preferences (only essential storage exists; nothing to opt into)
- [ ] **Blocked on the owner:** operator name, public contact email, postal address/city, governing law, and whether paid features are planned

## Accessibility, SEO, performance
- [ ] axe-core WCAG 2.2 AA scan of every route; fix violations
- [ ] Per-page descriptions and canonical URLs; social image; JSON-LD; robots.txt; sitemap.xml
- [ ] Immutable caching for hashed assets; vendor chunks; Lighthouse before/after

## UI and responsiveness
- [ ] Sweep every route at 320–1920 px (10 widths), light and dark; fix issues
- [ ] Consistent public footer and legal page layout

## Tests and docs
- [ ] Playwright suite in the repo (journeys, responsive overflow, accessibility)
- [ ] CI workflow (API tests, build, audit)
- [ ] README, SECURITY.md, docs/API.md, CHANGELOG.md

## Deploy
- [ ] Push and verify Render and Vercel (authorized: the owner asked to deploy everywhere)
