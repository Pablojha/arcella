# arcella.

A professional network for architecture students, alumni, faculty and firms in India: a feed of photo posts and vertical video reels with likes, comments, reposts, saves and Important alerts, portfolios with critiques, private college groups (members can verify several colleges: undergraduate, postgraduate and research degrees) with a group chat that works like direct messages and their own admin and co-admin, stories, jobs, firm pages, mentorship, events, Q&A, study resources and direct messages. It works as a website, an installable PWA and an Android app.

It also includes what a public launch needs: email verification with a one-time code at sign-up, search across the whole network, password reset by code, account deletion, reporting and blocking with an admin moderation queue, Terms, Privacy, Cookie, Refund, Community Guidelines, Copyright and Accessibility pages with a cookie notice, a "download your data" export, consent at sign-up, strict security headers, anti-spam rate limits, and automated accessibility (WCAG 2.2 AA), API and browser tests that run on every push.

Live at **[arcella-seven.vercel.app](https://arcella-seven.vercel.app)**.

| Folder | Stack | Hosting |
| --- | --- | --- |
| `backend/` | Node.js, Express 5, MongoDB (Mongoose), Socket.IO, JWT, Argon2id, zod 4, multer, Cloudinary, Web Push | Render (`render.yaml`) |
| `frontend/` | React 19, Vite, Tailwind CSS 4, Framer Motion, React Router, axios, lucide-react | Vercel (`vercel.json`) |
| `e2e/` | Playwright with axe-core | GitHub Actions (`.github/workflows/ci.yml`) |

More documentation: [SECURITY.md](SECURITY.md) (security model and incident steps), [docs/API.md](docs/API.md) (endpoints), [docs/COMPLIANCE.md](docs/COMPLIANCE.md) (legal and compliance status), [CHANGELOG.md](CHANGELOG.md), [docs/AUDIT.md](docs/AUDIT.md) (the November 2026 audit) and [APP.md](APP.md) (Android app).

## Run it locally

You need **Node.js 20.12 or newer** and a **MongoDB** database. Any of these works:

- Docker: `docker run -d --name arcella-mongo -p 27017:27017 mongo:7`
- A local MongoDB Community install
- A free MongoDB Atlas cluster (see [Deploy](#deploy))

**1. API**

```bash
cd backend
cp .env.example .env      # set ADMIN_EMAIL to the email you will register with
npm install
npm run dev               # http://localhost:5000  (health check: /api/health)
```

The first start seeds 45 Indian architecture colleges (SPA Delhi, CEPT, Sir JJ, IIT Roorkee, NIT Trichy and more). Re-running never overwrites edits made in the admin panel.

**2. Web app**

```bash
cd frontend
cp .env.example .env      # VITE_API_URL=http://localhost:5000
npm install
npm run dev               # http://localhost:5173
```

Register with an address in `ADMIN_EMAIL` and confirm it with the one-time code to become a site admin. Admin rights need an email proven with a code, so in production set up email (section 4 of [Deploy](#deploy)) before creating the admin account. If you registered first, set the variable and log in again.

**Codes in development.** With no Resend or SMTP settings, the 6-digit codes (sign-up, password reset, college email) are printed in the API terminal and shown on screen. In production, sign-up skips the code step until email is configured, so the site works from day one; password reset, college email and admin rights need email.

## Testing

| Suite | Command | Needs |
| --- | --- | --- |
| API (23 end-to-end tests: auth, admin rights, posts, comments, chat, reactions, push notifications, colleges, several colleges per member, group chat, moderation, data export, account deletion) | `cd backend && npm test` | MongoDB. Uses a separate `arcella_test` database (override with `MONGODB_TEST_URI`); email and Cloudinary are switched off, so nothing leaves your machine |
| Browser (Playwright: public pages and SEO tags, cookie notice, sign-up/login/logout/password reset, access control, education and the college switcher, live group chat with reactions, 10 screen widths from 320 to 1920 px, WCAG 2.2 AA via axe-core in light and dark, internal links) | `cd e2e && npm test` | The API and a production build running (below) |

To run the browser suite locally:

```bash
# 1. API outside production (codes come back in responses), allowing the preview origin
cd backend && CLIENT_URL=http://localhost:4173 ADMIN_EMAIL=admin@e2e.arcella AUTH_RATE_LIMIT=1000 npm run dev
# 2. Production build served with the same security headers as Vercel
cd frontend && VITE_API_URL=http://localhost:5000 npm run build && VITE_API_URL=http://localhost:5000 npm run preview
# 3. The suite (first time: npx playwright install chromium, or set E2E_CHANNEL=msedge|chrome to use an installed browser)
cd e2e && npm install && npm test
```

Settings: `E2E_BASE_URL` (default `http://localhost:4173`), `E2E_API_URL` (default `http://localhost:5000/api`), `E2E_ADMIN_EMAIL` (must be in the API's `ADMIN_EMAIL`, default `admin@e2e.arcella`) and `E2E_CHANNEL`.

GitHub Actions runs all of it on every push and pull request (`.github/workflows/ci.yml`): the API tests and a dependency audit, the website build and audit, then the Playwright suite against a real API and database.

## Environment variables

### `backend/.env`

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | yes | MongoDB connection string |
| `JWT_SECRET` | yes in production | Long random string used to sign sessions |
| `JWT_EXPIRES` | no | Session length, default `30d` |
| `CLIENT_URL` | yes | Frontend origin(s), comma-separated. `capacitor://localhost` and `https://localhost` are always allowed for the mobile app |
| `ADMIN_EMAIL` | no | Comma-separated emails that become site admins |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | recommended in production | Upload storage. Without them files go to local disk |
| `UPLOAD_DIR` | no | Folder for local uploads, default `backend/uploads` (for example a Render persistent disk) |
| `RESEND_API_KEY` or `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | for email | One-time codes for sign-up, password reset and college email. Resend is tried first, then SMTP |
| `MAIL_FROM` | with email | Sender, e.g. `Arcella <no-reply@yourdomain.in>` |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | for notifications | Web Push keys: generate the pair once with `npx web-push generate-vapid-keys` and never change it (new keys cancel everyone's notifications). The subject is a contact for push services, e.g. your site URL |
| `GIPHY_API_KEY` | no | GIF search in chats (free key from developers.giphy.com) |
| `AUTH_RATE_LIMIT` | no | Sign-in, sign-up and code attempts per IP per 15 minutes, default 30. Raise it only for local testing |
| `PORT` | no | Defaults to 5000 (Render sets it automatically) |

### `frontend/.env`

Everything here ends up in the browser bundle, so it must never hold a secret.

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | API base URL without `/api`, e.g. `https://arcella-api-pablojha.onrender.com` |
| `VITE_CONTACT_EMAIL` | Public contact address shown on the policy pages for privacy and legal requests |
| `VITE_SITE_URL` | The site's public address for canonical links and social previews, default `https://arcella-seven.vercel.app` |

## Deploy

### 1. Database: MongoDB Atlas (free)

1. Create a free M0 cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas), on AWS in **Singapore** so it sits next to the API.
2. Under **Database Access**, add a user with a password.
3. Under **Network Access**, add the Render service's outbound IP ranges, found in the Render dashboard under your service → **Connect** → **Outbound**. They appear once the service exists (section 2), and its first deploy fails until they are added.
4. **Connect → Drivers** gives a URI like `mongodb+srv://user:pass@cluster.xxxx.mongodb.net/arcella`. Keep `/arcella` as the database name.

### 2. API: Render

**Blueprint (uses `render.yaml`):** open [render.com/deploy?repo=https://github.com/Pablojha/arcella](https://render.com/deploy?repo=https://github.com/Pablojha/arcella) (or **New → Blueprint** and pick the repository) and fill in the variables it asks for (`MONGODB_URI`, `ADMIN_EMAIL` and optionally Cloudinary and email). `JWT_SECRET` is generated for you and `CLIENT_URL` is preset to the Vercel app.

**Manual:** **New → Web Service**, root directory `backend`, build command `npm install`, start command `npm start`, health check path `/api/health`, and add the variables from the table above with `NODE_ENV=production`.

Notes:

- The service runs in Render's **Singapore** region, the closest to India.
- Render's free instance sleeps after about 15 idle minutes and takes 30–60 seconds to wake. The workflow in `.github/workflows/keep-api-awake.yml` pings it every 10 minutes from 06:30 to 01:30 IST, which keeps it awake through the day while using about 600 of the workspace's 750 free hours a month, so another free service still fits. For all-day pings, change the cron hours `1-19` to `*`. If your Render URL is not `https://arcella-api-pablojha.onrender.com`, set a repository variable `API_URL` on GitHub. GitHub pauses scheduled workflows after 60 days without commits.
- Render's disk is wiped on every deploy and restart, so set up **Cloudinary** (free) for uploads in production. Its free plan caps raw files (DWG, ZIP, XLSX) at 10 MB, and PDF/ZIP delivery must be enabled under *Settings → Security*. Post videos are capped at 40 MB, the largest its free plan converts on the fly into the phone-friendly MP4 the feed plays.
- Verification documents are stored in MongoDB rather than on disk. Only site admins and that college's admin and co-admin can open them, and they are deleted as soon as a request is approved or rejected.

### 3. Web app: Vercel

1. **Add New → Project**, import the repository and set the root directory to `frontend` (framework: Vite).
2. Add `VITE_API_URL` = your Render URL, e.g. `https://arcella-api-pablojha.onrender.com`.
3. Deploy. `vercel.json` rewrites every route to `index.html` so deep links work.
4. `render.yaml` presets `CLIENT_URL` to `https://arcella-seven.vercel.app`. If your Vercel URL is different or you add a custom domain, update `CLIENT_URL` on Render (comma-separate several) and redeploy the API.

### 4. Email for one-time codes

- **Gmail (easiest, about 500 emails a day):** turn on 2-Step Verification for the Gmail account, create an app password, then set `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER=you@gmail.com`, `SMTP_PASS=<app password>` and `MAIL_FROM=Arcella <you@gmail.com>`.
- **Resend:** create an API key, **verify your own domain** (without it Resend only delivers to your own address) and set `RESEND_API_KEY` and `MAIL_FROM`.

### 5. Before you go public

- Fill in the operator's details in `frontend/src/config/site.js` (legal name, postal address, governing law, Grievance Officer, liability cap) and set `VITE_CONTACT_EMAIL` on Vercel. Until then the policy pages show them as clearly marked placeholders. Read the pages and adjust them to how you actually run Arcella, and work through [docs/COMPLIANCE.md](docs/COMPLIANCE.md) with a lawyer.
- Set up email (section 4), then make yourself admin with `ADMIN_EMAIL` and check the official email domains under **Admin → Colleges**. Only well-known domains are pre-filled.
- If you add a custom domain or move the API, update `CLIENT_URL` on Render, `VITE_SITE_URL` on Vercel, the API address in the Content-Security-Policy in `frontend/vercel.json` (and `PRODUCTION_API` in `vite.config.js`), and the URLs in `index.html`, `robots.txt` and `sitemap.xml`.
- Atlas's free M0 tier has no automatic backups: see [SECURITY.md](SECURITY.md#backups) for a backup routine.

## How college verification works

Members list every college they studied or teach at under **Education** on their profile: the college, their role (student, alumni or faculty) and, for students and alumni, the degree level (undergraduate, postgraduate or advanced research), the degree (B.Arch, M.Arch, PhD…) and the years. Each college is verified on its own and opens that college's group, so someone with a B.Arch from one college and an M.Arch from another belongs to both groups and switches between them on the **College** page. Their first verified college is the main one shown on cards; they can pick another.

1. A member picks a college (or adds a missing one), their role, degree level, degree and batch year, or starts from a college in their Education with **Verify to join the group**.
2. **College email:** offered only when an admin has set the college's official domains, e.g. `iitr.ac.in` (subdomains such as `ar.iitr.ac.in` also count). It sends a 6-digit code that expires in 10 minutes and allows 5 attempts, and the routes are rate-limited.
3. **Document:** a college ID card, result or marksheet, or degree certificate goes into a review queue for site admins and that college's admin and co-admin, who approve or reject it with a note. The member is notified either way.

Site admins manage colleges, email domains and manual verification from **More → Admin**, and can open every college group (**Admin → Colleges → Open group**). Each group has one **admin** and one **co-admin**, chosen from verified members on the group's **Members** tab: site admins choose both, and the college admin can pick their own co-admin. They review requests on the **Review** tab, remove posts and chat messages, and post Important updates to the whole group without the one-a-day limit members have.

Group chats use the same screens as direct messages: photos, videos, voice notes, GIFs, emoji reactions (double-tap for ❤️, hold for more), typing dots and live updates, with each sender's name and group role. On phones a group chat opens full screen like a conversation. Members report messages and delete their own.

Members verified before several colleges were allowed keep their college: at start-up the API gives each of them a matching membership (it changes nothing for anyone else).

## Important posts

Anyone can mark one post a day as **Important** (site admins and college admins in their group have no limit). It gets a red Important strip, and a notification goes to the author's connections, to every member of the college for a group post, or to everyone on Arcella when a site admin posts it.

## Safety and accounts

- **Report and block:** members can report posts, comments, projects, questions, answers and profiles, and block other members from a post, profile or conversation. Blocking hides posts, stories and comments both ways, stops messages and connection requests, and removes any existing connection.
- **Moderation:** open reports appear in **Admin → Reports** with a preview. Admins can remove the content (or delete the account) or dismiss the report.
- **Accounts:** new emails are confirmed with a 6-digit code. Codes expire after 10 minutes, allow 5 attempts and can be resent after 30 seconds. Password reset also uses a code. Passwords are hashed with Argon2id (older bcrypt hashes upgrade at the next sign-in). Changing your password signs out other devices and stops their notifications, and **Settings → Delete account** removes the member and everything they created.
- **Privacy controls:** members agree to the Terms and Privacy Policy at sign-up (the time is recorded). Arcella stores nothing for ads or analytics. The cookie notice and **Cookie settings** decide whether preferences such as dark mode are remembered across visits. **Settings → Your data** downloads a copy of everything Arcella stores about the member as a JSON file.
- **Rate limits:** login, sign-up and password routes are limited per IP; codes, posts, comments, messages, connection requests and reports are limited per account.

## Installable app

- **PWA:** production builds register `public/sw.js` and ship a manifest and icons. Android and desktop Chrome show an install banner; iOS users get a "Share → Add to Home Screen" hint.
- **Android:** Capacitor is configured (`frontend/capacitor.config.json`, app id `com.arcella.app`). See [APP.md](APP.md) to build the app and publish it on the Play Store.

## Scripts

| Where | Command | What it does |
| --- | --- | --- |
| backend | `npm run dev` | API with auto-restart on file changes |
| backend | `npm start` | API for production |
| backend | `npm test` | API test suite (needs MongoDB) |
| frontend | `npm run dev` | Vite dev server |
| frontend | `npm run build` | Production build into `dist/` |
| frontend | `npm run preview` | Serve the production build locally |
| frontend | `npm run android` | Build, sync to Android and open Android Studio |
| e2e | `npm test` | Playwright browser suite (see [Testing](#testing)) |
| e2e | `npm run report` | Open the last Playwright report |
