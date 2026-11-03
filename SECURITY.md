# Security

How Arcella protects its members, where its secrets live, and what to do when something goes wrong. Last reviewed in the November 2026 audit ([docs/AUDIT.md](docs/AUDIT.md)).

## Reporting a problem

If you find a vulnerability, email the contact address on the [Privacy Policy](https://arcella-seven.vercel.app/privacy) page with steps to reproduce it. Please don't open a public issue or test against other members' accounts.

## How Arcella is protected

**Accounts and sessions**
- Passwords are hashed with **Argon2id** (19 MiB, 2 passes, 1 lane: OWASP's baseline). Older bcrypt hashes are replaced at the member's next sign-in. Plain passwords are never stored or logged.
- Sessions are HS256 JWTs (algorithm pinned on both signing and checking), valid for 30 days and sent as Bearer tokens, so no cookies are involved and CSRF doesn't apply. Changing or resetting a password ends every older session and drops the account's push subscriptions.
- New emails are confirmed with 6-digit codes that expire after 10 minutes, allow 5 attempts and are rate-limited. Responses don't reveal whether an email has an account.
- **Admin rights** come from the `ADMIN_EMAIL` list, and only for an address proven with a one-time code. While production has no email provider, an existing account can't be re-registered over.

**The API**
- Every route validates its input with zod; unknown fields are dropped, which blocks mass assignment and NoSQL operator injection. Data access goes through Mongoose queries built from validated values.
- Authorization is checked on the server for every change: owners, the question's asker, mentor and mentee, college admins and site admins. Members can't read other people's messages, saved posts or chat settings.
- Rate limits: 30 auth attempts per IP per 15 minutes; 60 writes and 8 code requests per account per window.
- Helmet sets security headers, CORS allows only the configured origins, JSON bodies are capped at 1 MB, and production errors never expose internals.
- Uploads are restricted by type and size and given random names; SVG and HTML are refused.
- Push subscriptions are accepted only for Google, Mozilla, Apple and Microsoft push services, so the server never posts to an address a member made up (SSRF).
- Socket.IO connections are authenticated with the same token; typing indicators go only to people the sender may message.

**The website** (headers in `frontend/vercel.json`)
- **Content-Security-Policy:** scripts only from Arcella's own origin (no inline scripts), connections only to the API, media only from the API, Cloudinary and GIPHY, no plugins, and no framing (`frame-ancestors 'none'`). Inline *styles* are allowed because two libraries (image zoom and an animation mode) inject them; they can't run code.
- HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a `Permissions-Policy` allowing only the microphone (voice notes), and `Cross-Origin-Opener-Policy: same-origin`.
- React escapes all member content; links from members render only if they are `http(s):`, `mailto:` or `tel:`. There is no `dangerouslySetInnerHTML` or `eval`, and no redirects to addresses taken from a URL.
- `vite preview` serves the same headers, and the browser tests check them.

## Secrets

| Secret | Lives in | Rotate by |
| --- | --- | --- |
| `JWT_SECRET` | Render | Setting a new random value. Everyone is signed out. |
| `MONGODB_URI` (database password) | Render | Changing the password of the `arcella-api` user in Atlas, then updating Render |
| `CLOUDINARY_API_SECRET` | Render | Regenerating it in Cloudinary, then updating Render |
| `SMTP_PASS` / `RESEND_API_KEY` | Render | Creating a new app password or key, then revoking the old one |
| `VAPID_PRIVATE_KEY` | Render | Only if leaked: new keys silently cancel every member's notifications, and they must turn them on again |
| `GIPHY_API_KEY` | Render | Regenerating it in the GIPHY dashboard |

- Secrets are only ever set as environment variables on Render; nothing secret goes in the website bundle (`VITE_*` values are public by design).
- `.env` files are ignored by git (root and per-package `.gitignore`); only `.env.example` files with blank or placeholder values are committed.
- November 2026: a scan of every commit in the repository's history found no committed credentials.

## Database

- MongoDB Atlas (M0, AWS Singapore). The app's database user has `readWrite` on the `arcella` database only.
- The Atlas network access list allows only Render's outbound IP ranges. If Render's addresses change, the API fails with `tlsv1 alert internal error` until the list is updated.
- Verification documents are deleted as soon as a request is decided; stories expire after 24 hours and notifications after 60 days.

## Backups

Atlas's free M0 tier has **no automatic backups**. Until you move to a paid tier with continuous backups, keep a weekly copy:

```bash
# From a trusted computer whose IP you add to the Atlas access list for the duration (remove it afterwards):
mongodump --uri "<MONGODB_URI>" --gzip --archive="arcella-$(date +%F).gz"

# Restoring replaces the collections it contains, so try it on a separate database first:
mongorestore --uri "<MONGODB_URI_OF_A_TEST_DATABASE>" --gzip --archive="arcella-YYYY-MM-DD.gz" --drop
```

Keep the archives encrypted and off shared drives: they contain members' personal data. Uploaded media lives in Cloudinary, which has its own (paid) backup option.

## If something goes wrong

1. **Contain:** rotate the affected secret (table above). Rotate `JWT_SECRET` to sign everyone out if sessions may be compromised.
2. **Investigate:** check Render's logs and the Atlas activity feed. Look for unexpected admin accounts (`isAdmin: true`) and recent reports.
3. **Fix and deploy:** push the fix; Render and Vercel deploy from `main`. To roll back the website instantly, promote a previous deployment in Vercel; for the API, redeploy an earlier commit in Render.
4. **Tell people:** if members' data was exposed, tell them what happened, what was affected and what they should do, as required by applicable law.

## Dependencies

CI runs `npm audit --omit=dev --audit-level=high` for the API and the website on every push. The remaining advisories are inside `@capacitor/cli`, a development tool for building the Android app that never reaches the website. Major upgrades are done deliberately, with the full test suites.

## Known limitations

- Sessions are stored in `localStorage` rather than httpOnly cookies, because the website and API are on different sites, where browsers block such cookies. The strict CSP is the main defence against script injection.
- Uploaded photos, videos and voice notes are served from public, unguessable Cloudinary URLs; anyone with a link can open that file.
- Render's free plan sleeps after 15 idle minutes; a scheduled workflow keeps it awake during Indian daytime.
