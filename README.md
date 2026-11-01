# arcella.

A professional network for architecture students, alumni, faculty and firms in India: portfolios with critiques, private college groups with verified membership, stories, jobs, firm pages, mentorship, events, Q&A, study resources and direct messages. It works as a website, an installable PWA and an Android app.

It also includes what a public launch needs: email verification with a one-time code at sign-up, search across the whole network, password reset by code, account deletion, reporting and blocking with an admin moderation queue, a privacy page, and anti-spam rate limits.

| Folder | Stack | Hosting |
| --- | --- | --- |
| `backend/` | Node.js, Express 5, MongoDB (Mongoose), JWT, bcrypt, multer, zod | Render (`render.yaml`) |
| `frontend/` | React 19, Vite, Tailwind CSS 4, Framer Motion, React Router, axios, lucide-react | Vercel (`vercel.json`) |

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

Register with the address in `ADMIN_EMAIL` to become a site admin. If you registered first, set the variable and log in again.

**Codes in development.** With no Resend or SMTP settings, the 6-digit codes (sign-up, password reset, college email) are printed in the API terminal and shown on screen. In production, sign-up skips the code step until email is configured, so the site works from day one; password reset and college email codes need email.

**Tests.** With MongoDB running, `cd backend && npm test` runs the API test suite against a separate `arcella_test` database (override with `MONGODB_TEST_URI`). Email and Cloudinary are switched off during tests, so nothing leaves your machine.

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
| `PORT` | no | Defaults to 5000 (Render sets it automatically) |

### `frontend/.env`

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | API base URL without `/api`, e.g. `https://arcella-api-pablojha.onrender.com` |
| `VITE_CONTACT_EMAIL` | Optional contact address shown on the privacy page |

## Deploy

### 1. Database: MongoDB Atlas (free)

1. Create a free M0 cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas), on AWS in **Singapore** so it sits next to the API.
2. Under **Database Access**, add a user with a password.
3. Under **Network Access**, allow `0.0.0.0/0` (Render's free tier has no fixed IP).
4. **Connect → Drivers** gives a URI like `mongodb+srv://user:pass@cluster.xxxx.mongodb.net/arcella`. Keep `/arcella` as the database name.

### 2. API: Render

**Blueprint (uses `render.yaml`):** push the repo to GitHub, then in Render choose **New → Blueprint**, pick the repository and fill in the variables it asks for (`MONGODB_URI`, `CLIENT_URL`, `ADMIN_EMAIL` and optionally Cloudinary and email). `JWT_SECRET` is generated for you.

**Manual:** **New → Web Service**, root directory `backend`, build command `npm install`, start command `npm start`, health check path `/api/health`, and add the variables from the table above with `NODE_ENV=production`.

Notes:

- The service runs in Render's **Singapore** region, the closest to India.
- Render's free instance sleeps after about 15 idle minutes and takes 30–60 seconds to wake. The workflow in `.github/workflows/keep-api-awake.yml` pings it every 10 minutes so it stays awake. If your Render URL is not `https://arcella-api-pablojha.onrender.com`, set a repository variable `API_URL` on GitHub. GitHub pauses scheduled workflows after 60 days without commits.
- Render's disk is wiped on every deploy and restart, so set up **Cloudinary** (free) for uploads in production. Its free plan caps raw files (DWG, ZIP, XLSX) at 10 MB, and PDF/ZIP delivery must be enabled under *Settings → Security*.
- Verification documents are stored in MongoDB rather than on disk. Only admins and that college's moderators can open them, and they are deleted as soon as a request is approved or rejected.

### 3. Web app: Vercel

1. **Add New → Project**, import the repository and set the root directory to `frontend` (framework: Vite).
2. Add `VITE_API_URL` = your Render URL, e.g. `https://arcella-api-pablojha.onrender.com`.
3. Deploy. `vercel.json` rewrites every route to `index.html` so deep links work.
4. Copy the Vercel URL into `CLIENT_URL` on Render (comma-separate several, e.g. a custom domain too) and redeploy the API.

### 4. Email for one-time codes

- **Gmail (easiest, about 500 emails a day):** turn on 2-Step Verification for the Gmail account, create an app password, then set `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`, `SMTP_USER=you@gmail.com`, `SMTP_PASS=<app password>` and `MAIL_FROM=Arcella <you@gmail.com>`.
- **Resend:** create an API key, **verify your own domain** (without it Resend only delivers to your own address) and set `RESEND_API_KEY` and `MAIL_FROM`.

### 5. Before you go public

- Read the privacy page (`frontend/src/pages/Privacy.jsx`), adjust it to how you actually run Arcella, and set `VITE_CONTACT_EMAIL`.
- Make yourself admin with `ADMIN_EMAIL`, then check the official email domains under **Admin → Colleges**. Only well-known domains are pre-filled.

## How college verification works

1. A member picks their college (or adds a missing one), their role (student, alumni or faculty) and batch year.
2. **College email:** offered only when an admin has set the college's official domains, e.g. `iitr.ac.in` (subdomains such as `ar.iitr.ac.in` also count). It sends a 6-digit code that expires in 10 minutes and allows 5 attempts, and the routes are rate-limited.
3. **Document:** a college ID card, result or marksheet, or degree certificate goes into a review queue for site admins and that college's moderators, who approve or reject it with a note. The member is notified either way.

Admins manage colleges, email domains, moderators and manual verification from **More → Admin**. Moderators review requests from their college's **Review** tab.

## Safety and accounts

- **Report and block:** members can report posts, comments, projects, questions, answers and profiles, and block other members from a post, profile or conversation. Blocking hides posts, stories and comments both ways, stops messages and connection requests, and removes any existing connection.
- **Moderation:** open reports appear in **Admin → Reports** with a preview. Admins can remove the content (or delete the account) or dismiss the report.
- **Accounts:** new emails are confirmed with a 6-digit code. Codes expire after 10 minutes, allow 5 attempts and can be resent after 30 seconds. Password reset also uses a code. Changing your password signs out other devices, and **Settings → Delete account** removes the member and everything they created.
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
