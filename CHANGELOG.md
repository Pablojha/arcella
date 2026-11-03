# Changelog

## November 2026: production hardening

Starting point: tag `v1.0-pre-hardening`. Findings and reasoning: [docs/AUDIT.md](docs/AUDIT.md).

### Security
- Admin rights need an email proven with a one-time code. Production has no email provider yet, so it was granting admin to whoever registered an admin address first. While codes are off, an existing account can't be re-registered over.
- Passwords are hashed with Argon2id; older bcrypt hashes upgrade at the next sign-in without signing anyone out.
- zod 4 (fixes GHSA-mrhx-c7xc-m3w5). Patch updates for express-rate-limit, mongoose and the Vite React plugin. The API audit is clean.
- JWT algorithm pinned to HS256.
- The website sends a Content-Security-Policy, HSTS, nosniff, Referrer-Policy, Permissions-Policy and COOP, and refuses framing. The dark-mode script moved out of `index.html` so no inline script is needed.
- Links from member content render only if they are http(s), mailto or tel.
- A root `.gitignore` keeps every `.env` variant out of git.

### Legal and privacy
- New Terms of Use, Cookie Policy and Refund Policy pages; the Privacy Policy now covers chats, notifications, browser storage, third-party services and retention. Business details still to be confirmed show as marked placeholders (`frontend/src/config/site.js`).
- Consent to the Terms and Privacy Policy at sign-up, recorded as `termsAcceptedAt`.
- A cookie notice and **Cookie settings**: essential storage only by default; preferences such as dark mode are remembered across visits only with consent.
- Policy links in a shared footer on the landing page, the policy pages, the More page and the home sidebar, and in Settings.

### Accessibility (WCAG 2.2 AA)
- Every page now passes axe-core in light and dark mode. Fixes: avatar colours darkened so initials meet 4.5:1, decorative initials hidden from screen readers, named photo buttons, larger touch targets, underlined links in text, `aria-pressed` on choice buttons, keyboard-reachable photo uploads, and labels that match what is on screen.
- Animations follow the system "reduce motion" setting.

### Fixes
- Logging out (or deleting your account) now always lands on the home page; it could land on the login page instead. Logging out is instant, and the device's notification cleanup runs in the background.

### SEO and performance
- Per-page descriptions and canonical URLs, a 1200×630 social preview image, structured data, `robots.txt` and `sitemap.xml`; the 404 and password-reset pages are kept out of search.
- The branded splash plays only when Arcella opens as an installed app, so web pages show content at once. The landing page is in the main bundle, libraries are in long-lived chunks, and hashed assets are cached as immutable.

### Testing and tooling
- A Playwright suite in `e2e/`: public pages and SEO tags, cookie notice, sign-up/login/logout/password reset, access control, 10 screen widths, WCAG checks and internal links.
- GitHub Actions CI: API tests and audit, website build and audit, then the Playwright suite.
- `vite preview` serves the production security headers; `AUTH_RATE_LIMIT` makes the sign-in limit adjustable for local testing.
- New docs: SECURITY.md, docs/API.md, docs/AUDIT.md, TODO.md, and an updated README.

## Earlier (October–November 2026)
- Instagram-style messaging: photos, videos, voice notes, GIFs, reactions, pinned and hidden chats, and Web Push notifications with in-app banners.
- Instagram-style feed and reels, a comments sheet with replies and likes, Important posts, college groups with admins and a group chat, Cloudinary uploads, and deployment to Vercel, Render and MongoDB Atlas.
