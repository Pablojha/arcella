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
- [x] Lighthouse after deploy (mobile, live). Landing: performance 92 → 96, SEO 91 → 100, largest paint 3.1 s → 2.3 s. Explore: 91 → 89 (within run-to-run variance), SEO 92 → 100. Accessibility and best practices 100 everywhere. The cookie notice now paints with the page (it was the largest element on first visits).
- [ ] Later: prerender the public pages (landing, policies, explore) to HTML at build time. This is the remaining big win for first paint and for social previews of individual pages.

## UI and responsiveness
- [x] Sweep every route at 320, 375, 768 and 1280 px in light and dark: no overflow or runtime errors. The Playwright suite covers all 10 widths.
- [x] Consistent public footer and legal page layout; cookie table becomes cards on phones

## Tests and docs
- [x] Playwright suite in `e2e/` (public pages, cookie notice, auth journeys, access control, 10 widths, WCAG, links): 30 passed, 4 skipped by design. It caught a real bug (logout landing on the login page), now fixed.
- [x] CI workflow (API tests + audit, website build + audit, Playwright)
- [x] README, SECURITY.md, docs/API.md, CHANGELOG.md

## Round 2 (owner's requests, 3 November 2026)

### Legal and compliance
- [x] Terms: disclaimers and limitation of liability, intellectual property (licence, copyright, trademarks), copyright complaints (notice and counter-notice), Grievance Officer (India IT Rules 2021), indemnity
- [x] Privacy: rights under India's DPDP Act 2023, GDPR (EU/UK) and CCPA/CPRA (California); legal bases; "we don't sell or share"; how to exercise rights; grievance redressal
- [x] New pages: Community Guidelines (moderation policy), Copyright policy (takedown procedure), Accessibility statement (WCAG 2.2 AA / ADA / EN 301 549 status and known gaps)
- [x] In the app: download my data (Settings), "copyright or IP" as a report reason
- [x] docs/COMPLIANCE.md: status and owner to-dos for every area, including payments/PCI, contracts, and business structure and tax (no legal advice; points to a lawyer/CA)
- [ ] **Owner decisions** raised there: minimum age 16 vs DPDP's under-18 parental consent, IT Rules 180-day retention, CERT-In incident reporting and logs, trademark, code licence

### Several colleges per member (chosen: join several college groups)
- [x] `memberships` on users: college, role, level (undergraduate/postgraduate/research), degree, batch, verified; migrate existing single-college members without losing data
- [x] Group access, members lists, Important-post audiences and admin roles work per verified membership
- [x] Verification per college (several requests allowed); the first verified college stays the primary one
- [x] Profile education section (add/edit/remove colleges by level and degree); college switcher on the College page

### Group chat like direct messages
- [x] Group messages: photos, videos, voice notes, GIFs, reactions; live over Socket.IO college rooms with typing
- [x] Same UI as DMs (bubbles, composer, reactions, lightbox, voice) plus sender names and admin badges; moderators can delete; full screen on phones

## Round 3: full professional network (plan and audit: docs/ROADMAP.md)

- [x] M0 Several colleges per member and group chat (above): committed in bea9362; full browser suite green on desktop and phone
- [x] M1 Job applications: apply with resume, saved jobs, my applications, recruiter pipeline, statuses, notifications, edit jobs, workplace/experience filters
- [x] M2 Account security: devices and sign-out all, login history, new-device alert, TOTP two-factor, lockout
- [x] M3 Admin RBAC: staff roles and permissions, suspend/ban/restore, audit log, job and firm moderation, verified firms
- [x] M4 Social: edit posts, mentions, hashtags, follow, notification preferences
- [x] M5 Messaging: delete own message, search, message requests
- [ ] M6 Profiles and companies: certifications, languages, resume, profile views, contact privacy; firm co-admins, posts, analytics
- [ ] M7 Help Center, Contact Support, Report a problem
- [ ] M8 AI features (**needs ANTHROPIC_API_KEY**)
- [ ] M9 Premium (**blocked on the owner:** payment provider and business details)

## Deploy
- [x] Pushed and verified: Render live, Vercel live, CI green (API tests, website build, Playwright), and a live smoke test of every public page (no console errors, nothing blocked by the CSP)
