# Roadmap: Arcella as a full professional network

Written 3 November 2026 from a review of the code at commit `37d9547` plus the uncommitted multi-college work. The checklist lives in [`TODO.md`](../TODO.md) under "Round 3"; this file records the audit and the reasoning.

## What is already there (kept as is)

| Area | Existing |
|---|---|
| Stack | React 19 + Vite + Tailwind 4 (Vercel), Express 5 + Mongoose 8 + Socket.IO + zod (Render), MongoDB Atlas, Cloudinary, Web Push. No reason to change any of it. |
| Auth | Email + password (Argon2id), sign-up code, password reset, admin email proven by code, JWT pinned to HS256 and revoked by a password change, per-IP limits on sign-in. |
| Profiles | Avatar, cover, headline, bio, location, website, skills, software, experience, education (several colleges), portfolio projects with critiques, profile strength meter, data export, account deletion. |
| Social | Posts with media, likes, saves, reposts/quotes, comments with replies, stories, reels, connections (request/accept/remove), suggestions, block, reports, search. |
| Messaging | 1:1 chat over Socket.IO with media, voice notes, GIFs, reactions, typing, online status, read state, pin/hide, unread badges, push notifications. College group chats. |
| Jobs and companies | Job listings (external apply link), firm pages with logo, cover, gallery, team, followers and their open roles. |
| Community | Colleges with verified groups and college admins, events with RSVP, mentorship sessions, Q&A, shared resources. |
| Admin | Stats, users (verify), colleges, report queue with removal. |
| Quality | 23 API tests, Playwright suite (pages, auth, access, 10 widths, WCAG 2.2 AA, links), CI, security headers, legal pages. |

## Gaps against the brief, ranked

1. **Jobs have no applications.** Seekers leave through an external link, so there are no applications, statuses, applicants or recruiter pipeline. This is the biggest gap against LinkedIn.
2. **Account security.** There is no list of signed-in devices, no "sign out everywhere" without a password change, no login history or failed-attempt record, no new-device alert and no two-factor sign-in.
3. **Admin and roles.** There is one `isAdmin` flag. The brief asks for staff roles (super admin, admin, moderator, support), suspending and banning accounts, an audit log, and moderation of jobs and companies.
4. **Social gaps.** Posts can't be edited. There are no @mentions, hashtag pages or notification preferences, and members can't follow without connecting.
5. **Messaging gaps.** Members can't delete their own message, search a conversation, or keep message requests from strangers apart.
6. **Profiles.** Certifications, languages, a resume file, profile views and contact privacy are missing.
7. **Companies.** A company has one owner, with no co-admins, verified badge, company posts or analytics.
8. **Help.** There are no Help Center, Contact Support or "report a problem" pages.

## Needs the owner (not built until decided)

| Item | Why it's blocked |
|---|---|
| Premium plans and payments | No payment provider exists, the business details are unfilled, and the Refund Policy says there are no paid features. Payments need a provider account (Razorpay suits India) under the operator's legal name. The brief rules out simulated payments. |
| AI features | No AI provider is configured. This can be built against the Claude API on the server only, hidden when `ANTHROPIC_API_KEY` is unset, but the live behaviour can only be tested once a key exists. |
| Google sign-in | Needs a Google Cloud OAuth client created by the owner. |
| Email sending (verification codes, alerts, email notifications) | The Gmail SMTP app password is still unset on Render. The code paths exist; they return 503 in production until it is set. |

## Plan, in milestones

Each milestone is done only when it has API tests, a Playwright journey where it has UI, a clean production build, and a check at phone and desktop widths. Existing models and endpoints are extended in a backward-compatible way: no data is dropped, and no new infrastructure (such as Redis) is added unless measurements call for it.

- **M0. Finish in-flight work:** several colleges per member, and group chat at parity with direct messages.
- **M1. Applications and recruiting:** apply in the app with a resume, saved jobs, My applications with status, an applicants pipeline for the firm's team (shortlist, reject, interview with date and note), notifications on each change, job editing, and filters for workplace (onsite, hybrid, remote) and experience.
- **M2. Account security:** signed-in devices with sign-out for one, others or all; login history with failed attempts; new-device notification; TOTP two-factor sign-in with recovery codes; temporary lockout after repeated failures.
- **M3. Admin and RBAC:** a `staffRole` field (super admin, admin, moderator, support) and a permission map enforced by middleware, with promotions only by someone of higher rank and never of oneself. Plus suspend, ban and restore, an audit log of every staff action, moderation of jobs and firms, a verified-firm badge, and stats from live counts.
- **M4. Social:** post editing, @mentions and hashtags (links, notifications, a tag feed), following, and notification preferences.
- **M5. Messaging:** delete own message, search a conversation, message requests from non-connections.
- **M6. Profiles and companies:** certifications, languages, resume file, profile views, contact visibility; firm co-admins, company posts and simple analytics.
- **M7. Help:** Help Center, Contact Support and Report a problem, feeding the admin queue.
- **M8. AI (needs a key):** writing help for posts and profiles, resume feedback, job matching, all on the server with a fallback.
- **M9. Premium (needs the owner):** only after the payment and business decisions above.
