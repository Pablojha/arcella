# Changelog

## November 2026: AI assistant (off until a key is set)

- **Writing help:** "Improve with AI" in the post composer; "Suggest a headline" and "Draft/Improve with AI" for the About section in Edit profile. Facts, #hashtags and @mentions are kept, and nothing is invented.
- **Resume feedback** on your saved PDF resume: a summary, strengths and improvements.
- **How well do I match?** on job pages: a fit score, what you already have, what to build or show, and advice.
- Runs on Claude Opus 5.5 through the official Anthropic SDK on the API server, with structured outputs for the analyses and Anthropic's default server-side fallback if the model declines. Needs `ANTHROPIC_API_KEY` on Render; until then every AI button stays hidden and the routes answer 503. 20 requests per member per hour.
- Tests: an API test against a local stand-in for the Claude API (model, key, fallback, PDF document block, structured output, refusal) and browser tests for both the switched-off and switched-on app.

## November 2026: help and support

- **Help** (More → Help and support): a Help center answering common questions from how Arcella works, **Contact support** by topic, and **My requests** with the team's replies and follow-ups.
- **Report a problem** (in the app's footer) opens the form with the page you were on, sent along with your browser to help find the problem.
- **Admin → Support** for the support role and above: open, answered and closed requests, reply and close. Members are notified of replies, and every reply or closing is in the audit log. Support requests are included in data exports and deleted with the account.

## November 2026: firm admins, firm posts and insights

- **Firm admins:** the owner picks admins from the firm's team list (Team tab). Admins post roles, see applicants and post as the firm; leaving the team ends the role.
- **Posts as the firm** (firm page → Posts) appear under the firm's name with "Posted by…", and reach the firm's followers in their My network feed.
- **Insights** for the owner and admins: followers, open roles, applications, shortlisted, interviews and offers.
- Notifications for firm admin roles and for job or firm pages removed by moderators now have their own wording.

## November 2026: richer profiles

- **Languages and certifications** (name, issuer, year, link) on profiles.
- **Contact details with privacy:** members choose who sees their email and an optional phone number (only me, connections or everyone); `GET /api/users/:id` returns only what the viewer may see as `contactInfo`.
- **Profile views:** each viewer counts once a day; your profile shows how many people viewed it in 30 days and who (kept 90 days, only visible to you).
- **Saved resume:** keep one private resume on your profile and apply to jobs with it in one tap.

## November 2026: message requests, unsend and chat search

- **Message requests:** anyone who isn't blocked can send one first message to a member they aren't connected with (Message on any profile). It waits under **Messages → Message requests** until the member replies, and the sender can't send more meanwhile. Connections, verified batchmates and existing chats work as before.
- **Unsend** your own messages from the long-press menu; they disappear for both people at once, with any photo, video or voice note.
- **Search a chat** from its menu.

## November 2026: hashtags, mentions, following and notification choices

- **#hashtags** in posts link to a feed of every post with that tag (`/tags/:tag`). **@username** in posts and comments notifies that member and links to their profile; only real members become links, and email addresses are never read as mentions.
- **Edit a post's words** from its menu. Hashtags and mentions update, only newly mentioned members are told, and the post shows "edited".
- **Follow** members without connecting: their posts join your My network feed and they're told. Profiles show followers. Blocking ends follows both ways.
- **Notification choices** (Settings → Notifications): switch off likes, comments, mentions, network, posts, jobs or mentoring notices. Security alerts and verification results always arrive.

## November 2026: photos that always show

- Photos in formats the browser can open but the API doesn't store (AVIF, BMP, HEIC in Safari) are converted to JPEG before upload. iPhone HEIC photos are accepted with Cloudinary and delivered as JPEG.
- Media lost before Cloudinary was set up (Render's free plan wipes its disk on every restart) no longer shows as broken: profile photos fall back to initials, and other photos and videos show an "unavailable" placeholder. In production the API refuses to start without Cloudinary, so this can't happen again.
- The Create a post shortcuts wrap on wider screens instead of cutting off Job.

## November 2026: staff roles and the admin dashboard

- **Roles:** support (read users and reports), moderator (resolve reports, suspend accounts, take down jobs), admin (verify, ban, colleges, firm badges, audit log) and super admin (hands out roles). Every admin route checks its permission on the server, and the dashboard shows only the tabs a role can use. Existing site admins became super admins (`ADMIN_EMAIL` addresses) or admins at start-up.
- **Suspend, ban and restore** from Admin → Users, with a reason the member sees at sign-in. Suspending signs the account out everywhere. Staff can't act on themselves or on staff of their own rank or above.
- **Audit log** (Admin → Audit log) of every staff action, kept for a year.
- **Job and firm moderation:** search every job and firm, remove one with a reason (the owner is told), and give firms a verified badge that shows on their page and card.
- **Overview:** members active this week, joined this week and month, suspended accounts, applications, firms and connections, plus a chart of weekly sign-ups for the last 12 weeks (with a table for screen readers).
- Tests: a new API test for every permission boundary (28 in all) and a browser journey (promote, the moderator's tabs, suspend, the member's sign-in message, audit log, axe check) on desktop and phone.

## November 2026: account security

- **Where you're signed in** (Settings → Security): every device with when it was last active, sign out any one of them, or all except this one. Logging out now ends the session on the server too, and a signed-out device's live connection closes at once. Sessions from before this change keep working until the member signs out other devices or changes their password.
- **Two-factor sign-in** with any authenticator app (TOTP): set up with a key or an otpauth link, confirmed with a code, plus 8 single-use recovery codes. Codes can't be reused, and the setup secret is never sent to the app again. A password reset doesn't switch it off, because it proves the inbox, not the phone.
- **Lockout:** 5 failed sign-ins on an account within 15 minutes lock it for 15 minutes, on top of the per-IP limit.
- **Recent sign-ins** list successful and failed attempts (kept 90 days). Signing in on a new device sends a notification, and an email once a mail provider is set.
- Data export now includes signed-in devices and sign-in history; deleting an account removes both.
- Tests: 3 new API tests (27 in all), including RFC 6238 vectors checked during development, and a browser journey (devices, two-factor setup, sign-in with a recovery code, server-side logout) on desktop and phone.

## November 2026: job applications and hiring

- **Apply in Arcella.** Roles without an external link take applications in the app: a resume (PDF or Word, up to 3 MB) and an optional note. Applicants follow each one under **Jobs → Applied**, see interview times on the role, get a notification at every stage, and can withdraw.
- **Hiring pipeline.** The poster, the firm's owner and its admins see **Applicants** for each role: stage tabs with counts, the note, the resume, a Message button, and stage changes (shortlisted, interview with date and details, offered, not selected). **Jobs → Hiring** lists their roles with applicant counts. Roles can be edited, closed and reopened.
- **Resumes are private.** They are stored in the database, not at a public URL, and only the applicant and the people hiring can download them. They are deleted with the role or the account and appear in data exports without the file.
- **Saved jobs** (**Jobs → Saved**), and filters for workplace (on-site, hybrid, remote) and experience. Existing roles get their workplace from the old remote flag at start-up.
- **Security fix:** "I work here" on a firm page is self-declared, but it let anyone post roles in the firm's name. Only the firm's owner and the admins it names can now post its roles or see their applicants.
- **Accessibility fixes:** the job, event and question pages had two `h1` headings. The phone header's notification button now includes its unread count in its name (WCAG 2.5.3).
- Tests: a new API test for the whole pipeline (24 in all) and a browser journey (post, filter, save, apply, download the resume, schedule an interview, notification) with axe checks, on desktop and phone.

## November 2026: several colleges and group chats like direct messages

- **Several colleges per member.** Profiles have an **Education** section: each college with the member's role, degree level (undergraduate, postgraduate or advanced research), degree and years. Each one can be verified (college email or document) and opens that college's private group, so members belong to every group they verified. The **College** page switches between them, and members choose which college is their main one.
- Group access, members lists (grouped by batch, with each member's degree), Important-post audiences, college-only events (the host picks the college), stories for college mates, batchmate messaging and group admin roles now work per verified college. Leaving a college also ends any admin role in its group.
- Existing members keep their verified college: the API copies it into their memberships at start-up, without changing anything else.
- **Group chats work like direct messages:** photos, videos, voice notes, GIFs, emoji reactions, typing dots and live updates over Socket.IO, in the same bubbles and composer as direct messages, with sender names and group roles. On phones a group chat opens full screen. Reports and deletes are in the long-press menu.
- Live group updates only announce new messages; each chat then fetches them through the API, so blocks still apply. Typing is not sent to people blocked either way.
- Deleting a group message or an account now also deletes the photos, videos and voice notes in it, and report previews show attachments.
- Tests: 3 new API tests (23 in all) and a new browser test file for education, the college switcher and live group chat on desktop and phone.

## November 2026: legal and compliance

- **Terms of Use** now cover disclaimers, limitation of liability (cap to be set by the operator), indemnity, intellectual property and licences, moderation, a Grievance Officer under India's IT Rules 2021 (acknowledge in 24 hours, resolve in 15 days), and how the terms end or change.
- **Privacy Policy** now covers rights under India's DPDP Act 2023, GDPR (EU and UK) and CCPA/CPRA (California), legal bases, data location, breaches and how to use each right.
- New **Community Guidelines** (`/guidelines`, the moderation policy), **Copyright Policy** (`/copyright`, notice and counter-notice) and **Accessibility Statement** (`/accessibility`, WCAG 2.2 AA status and known gaps). All are in the footer, Settings and the sitemap.
- **Settings → Your data** downloads a JSON copy of the member's account, content, messages, connections and settings (`GET /api/users/me/export`). It never includes password hashes or push keys, and shows other people's likes and follows as counts.
- "Copyright or IP" is a new report reason.
- [docs/COMPLIANCE.md](docs/COMPLIANCE.md) lists what is in place and the owner's to-dos for each area: data protection, liability, IP, payments (PCI DSS), user content, accessibility, contracts, and business structure and tax.

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
