# Arcella API

The REST API behind the website and app: Express 5 on Render, at `https://arcella-api-pablojha.onrender.com` (locally `http://localhost:5000`). Every path starts with `/api`.

## Conventions

- **Auth:** sign up or log in to get a token, then send `Authorization: Bearer <token>`. Tokens are HS256 JWTs valid for 30 days (`JWT_EXPIRES`), and they stop working when the password changes or the account is deleted. No cookies are used, so CSRF doesn't apply.
- **Access** in the table below means: *public* (anyone), *member* (any signed-in account; ownership and role checks happen inside the handler), and *admin* (site admins only). College groups additionally require verified membership of that college. *Staff* means a site role with the named permission (see [Roles](#roles)). *Hiring* means the person who posted the role, the owner or an admin of its firm, or a site admin.
- **Input:** JSON bodies up to 1 MB, or multipart for uploads. Every route validates its input with zod, and unknown fields are dropped. A failed check returns `400` with one readable sentence, e.g. `{"message":"Name must be at least 2 characters"}`.
- **Errors:** always `{"message": "..."}` with the usual status codes (`400`, `401`, `403`, `404`, `409`, `429`, `503`). Unexpected server errors return `500` with a generic message; details stay in the server log.
- **Lists:** paged with `?page=` (from 1) and `?limit=` (up to 50), answering `{ items, hasMore }`.
- **Rate limits:** *auth limit* is 30 attempts per IP per 15 minutes (`AUTH_RATE_LIMIT`). *Write limit* is 60 per account per minute, and *code limit* is 8 code requests per account per 15 minutes. Going over returns `429` with `RateLimit-*` headers.
- **Uploads:** photos (jpg, png, webp, gif) up to 8 MB, videos and voice notes up to 40 MB, documents per route. Types are checked by extension and MIME type; SVG and HTML are refused. Files are stored on Cloudinary (or local disk in development).

## Realtime (Socket.IO)

Connect to the API origin with `auth: { token }`. Each socket joins its member's room.

| Event | Direction | Payload |
| --- | --- | --- |
| `message:new` | server → both people | the new message |
| `message:seen` | server → sender | `{ by, until }`: read up to this message |
| `message:update` | server → both people | `{ _id, reactions }` |
| `message:alert` | server → recipient | a notification (`{ chat, title, body, url, tag, badge, user? }`) for windows not showing that chat |
| `typing` | both ways | client sends `{ to, typing }`; server relays `{ from, typing }` to people the sender may message |
| `group:join` / `group:leave` | client → server | `{ college }`: an open group chat joins its college's room (members and site admins only; the acknowledgement says whether it joined) |
| `group:new` | server → college room | `{ college, _id }`: a new message; each chat fetches it with `GET /api/colleges/:id/chat?after=`, so blocks apply |
| `group:update` | server → college room | `{ college, _id, reactions }` (reactions name who reacted) |
| `group:remove` | server → college room | `{ college, _id }`: a message was deleted |
| `group:typing` | both ways | client sends `{ college, typing }`; server relays `{ college, user, typing }` to the room, except people blocked either way |
| `presence` | client → server | `{ visible, chat, endpoint }`, so notifications skip a chat being read or a screen that is on (optional ack) |

## Push notifications

`GET /api/push/key` returns the public VAPID key (or `null` when push isn't configured). `POST /api/push/subscriptions` saves the browser's subscription `{ endpoint, keys: { p256dh, auth } }` for the signed-in member; only Google, Mozilla, Apple and Microsoft push endpoints are accepted. `DELETE` with `{ endpoint }` removes it (sent on sign-out).

## Endpoints

| Method | Path | Access | Handler |
| --- | --- | --- | --- |
| GET | `/api/health` | public | health check |
| POST | `/api/auth/register` | public · auth limit | register |
| POST | `/api/auth/login` | public · auth limit · account lockout | login; with two-factor on, returns `{ twoFactor, ticket }` instead of a session |
| POST | `/api/auth/verify-email` | public · auth limit | verifyEmail |
| POST | `/api/auth/resend-code` | public · auth limit | resendSignupCode |
| POST | `/api/auth/forgot` | public · auth limit | forgotPassword |
| POST | `/api/auth/reset` | public · auth limit | resetPassword |
| GET | `/api/auth/me` | member | me |
| PATCH | `/api/auth/password` | member · auth limit | changePassword |
| POST | `/api/auth/2fa/login` | public · auth limit | second sign-in step: `ticket` from login plus an app code or recovery code |
| POST | `/api/auth/2fa/setup` | member | start two-factor setup: `secret` and `url` (otpauth) |
| POST | `/api/auth/2fa/enable` | member · auth limit | confirm with a `code`; returns 8 single-use `recoveryCodes` |
| POST | `/api/auth/2fa/disable` | member · auth limit | turn off with `password` and a `code` |
| GET | `/api/auth/devices` | member | signed-in devices, the caller's marked `current` |
| DELETE | `/api/auth/devices/:id` | member | sign that device out |
| POST | `/api/auth/devices/sign-out-others` | member | sign out every other device; returns a fresh `token` for this one |
| POST | `/api/auth/logout` | member | end this device's session |
| GET | `/api/auth/history` | member | the last 20 sign-in attempts (successful, wrong password, wrong code, locked) |
| GET | `/api/users` | member | search |
| GET | `/api/users/suggestions` | member | suggestions |
| PATCH | `/api/users/me` | member | updateMe |
| DELETE | `/api/users/me` | member | deleteMe |
| GET | `/api/users/me/blocked` | member | blockedList |
| GET | `/api/users/me/export` | member | exportMe (JSON file download, 5 an hour) |
| POST | `/api/users/me/memberships` | member | addMembership (a college in your education, unverified) |
| PUT | `/api/users/me/memberships/:membershipId` | member | updateMembership (verified ones keep their batch and faculty status) |
| DELETE | `/api/users/me/memberships/:membershipId` | member | removeMembership (a verified one leaves that group) |
| POST | `/api/users/me/memberships/:membershipId/primary` | member | choosePrimary (the college shown on cards and the profile) |
| POST | `/api/users/me/avatar` | member | updateImage |
| POST | `/api/users/me/cover` | member | updateImage |
| GET | `/api/users/:id` | member | profile |
| POST | `/api/users/:id/follow` | member | follow or unfollow (`following`, `followersCount`); refused between blocked members |
| GET | `/api/users/me/views` | member | profile views in the last 30 days: `count` and the latest `viewers` |
| GET | `/api/users/me/resume` | member | the saved resume's name and size (the file itself: `/api/users/me/resume/file`) |
| PUT | `/api/users/me/resume` | member | save or replace the resume: multipart `resume` (PDF, DOC or DOCX, up to 3 MB); private to the member |
| DELETE | `/api/users/me/resume` | member | remove the saved resume |
| PUT | `/api/users/me/notifications` | member | `off`: notification groups to switch off (`likes`, `comments`, `mentions`, `network`, `posts`, `jobs`, `mentoring`) |
| POST | `/api/users/:id/block` | member | toggleBlock |
| GET | `/api/connections` | member | list |
| GET | `/api/connections/requests` | member | requests |
| POST | `/api/connections/:userId` | member · write limit | send |
| POST | `/api/connections/:userId/accept` | member | accept |
| DELETE | `/api/connections/:userId` | member | remove |
| GET | `/api/posts` | member | feed |
| POST | `/api/posts` | member · write limit | create |
| GET | `/api/posts/:id` | member | get |
| PATCH | `/api/posts/:id` | the author · write limit | edit the `text`; hashtags and mentions are read again, newly mentioned members are told, `editedAt` is set |
| DELETE | `/api/posts/:id` | member | remove |
| POST | `/api/posts/:id/like` | member | like |
| POST | `/api/posts/:id/save` | member | save |
| POST | `/api/posts/:id/repost` | member · write limit | repost |
| DELETE | `/api/posts/:id/repost` | member | undoRepost |
| GET | `/api/posts/:id/comments` | member | comments |
| POST | `/api/posts/:id/comments` | member · write limit | addComment |
| POST | `/api/posts/:id/comments/:commentId/like` | member | likeComment |
| DELETE | `/api/posts/:id/comments/:commentId` | member | removeComment |
| GET | `/api/stories` | member | list |
| POST | `/api/stories` | member · write limit | create |
| POST | `/api/stories/:id/view` | member | view |
| POST | `/api/stories/:id/reply` | member · write limit | reply |
| DELETE | `/api/stories/:id` | member | remove |
| GET | `/api/projects` | public (more when signed in) | list |
| GET | `/api/projects/:id` | public (more when signed in) | get |
| POST | `/api/projects` | member | create |
| PATCH | `/api/projects/:id` | member | update |
| DELETE | `/api/projects/:id` | member | remove |
| POST | `/api/projects/:id/appreciate` | member | appreciate |
| GET | `/api/jobs` | member | list (filters: `q`, `type`, `location`, `workplace`, `experience`, `firm`; `saved=true` or `hiring=true` for the viewer's saved roles or the roles they hire for) |
| POST | `/api/jobs` | member (firm roles: the firm's owner or admins) | create; no `applyLink` means applications come in through Arcella |
| GET | `/api/jobs/applications` | member | the viewer's own applications (`status` filter) |
| POST | `/api/jobs/applications/:applicationId/withdraw` | the applicant | withdraw |
| PATCH | `/api/jobs/applications/:applicationId` | hiring | set `status` (`applied`, `shortlisted`, `interview` with `interviewAt`, `offered`, `rejected`); the applicant is notified |
| GET | `/api/jobs/applications/:applicationId/resume` | the applicant or hiring | the resume file (never at a public URL) |
| GET | `/api/jobs/:id` | member | get, with `saved`, the viewer's `application` and `canManage` |
| PATCH | `/api/jobs/:id` | hiring | update, including `closed` |
| DELETE | `/api/jobs/:id` | hiring | remove, with its applications |
| POST | `/api/jobs/:id/save` | member | toggle saved |
| POST | `/api/jobs/:id/applications` | member | apply: multipart `resume` (PDF, DOC or DOCX, up to 3 MB) and an optional `note` |
| GET | `/api/jobs/:id/applications` | hiring | applicants (`status` filter) and `counts` per stage |
| GET | `/api/firms` | member | list |
| POST | `/api/firms` | member | create |
| GET | `/api/firms/:slug` | member | get |
| PATCH | `/api/firms/:id` | member | update |
| POST | `/api/firms/:id/follow` | member | follow |
| PUT | `/api/firms/:id/admins/:userId` | the firm's owner or a site admin | make a team member a firm admin (they're notified) |
| DELETE | `/api/firms/:id/admins/:userId` | the firm's owner or a site admin | remove a firm admin |
| POST | `/api/firms/:id/work` | member | "I work here" (self-declared, so it grants no hiring rights) |
| GET | `/api/mentorship/mentors` | member | mentors |
| PUT | `/api/mentorship/settings` | member | settings |
| GET | `/api/mentorship/sessions` | member | sessions |
| POST | `/api/mentorship/sessions` | member | request |
| PATCH | `/api/mentorship/sessions/:id` | member | update |
| GET | `/api/events` | member | list |
| POST | `/api/events` | member | create |
| GET | `/api/events/:id` | member | get |
| POST | `/api/events/:id/rsvp` | member | rsvp |
| DELETE | `/api/events/:id` | member | remove |
| GET | `/api/questions` | member | list |
| POST | `/api/questions` | member · write limit | create |
| GET | `/api/questions/:id` | member | get |
| DELETE | `/api/questions/:id` | member | remove |
| POST | `/api/questions/:id/upvote` | member | upvote |
| POST | `/api/questions/:id/answers` | member · write limit | answer |
| POST | `/api/questions/:id/answers/:answerId/upvote` | member | upvoteAnswer |
| POST | `/api/questions/:id/answers/:answerId/accept` | member | accept |
| DELETE | `/api/questions/:id/answers/:answerId` | member | removeAnswer |
| GET | `/api/resources` | member | list |
| POST | `/api/resources` | member | create |
| POST | `/api/resources/:id/bookmark` | member | bookmark |
| POST | `/api/resources/:id/download` | member | download |
| DELETE | `/api/resources/:id` | member | remove |
| GET | `/api/colleges` | member | list |
| POST | `/api/colleges` | member | create |
| GET | `/api/colleges/:id` | member | get |
| GET | `/api/colleges/:id/members` | member | members |
| PATCH | `/api/colleges/:id/roles` | member | setRole |
| GET | `/api/colleges/:id/chat` | member | inline |
| POST | `/api/colleges/:id/chat` | member · write limit | send (text or GIF) |
| POST | `/api/colleges/:id/chat/attachments` | member · write limit | sendAttachment (photo, video or voice note) |
| PUT | `/api/colleges/:id/chat/:messageId/reaction` | member · write limit | react (one emoji per member; the same one again removes it) |
| DELETE | `/api/colleges/:id/chat/:messageId` | member | remove |
| GET | `/api/verification/me` | member | mine |
| POST | `/api/verification/email/send` | member · code limit | sendCode |
| POST | `/api/verification/email/confirm` | member · code limit | confirmCode |
| POST | `/api/verification/document` | member | uploadDocument |
| GET | `/api/verification/queue` | member | queue |
| GET | `/api/verification/:id/document` | member | document |
| POST | `/api/verification/:id/review` | member | review |
| GET | `/api/messages` | member | conversations (`requests=true` lists message requests) |
| DELETE | `/api/messages/item/:messageId` | the sender | unsend a message for both people (`message:deleted` over Socket.IO) |
| GET | `/api/messages/:userId/search` | member | messages in that chat whose text matches `q` (30 newest) |
| PUT | `/api/messages/reactions/:messageId` | member · write limit | react |
| PATCH | `/api/messages/:userId/state` | member | setState |
| GET | `/api/messages/:userId` | member | thread |
| POST | `/api/messages/:userId` | member · write limit | send |
| POST | `/api/messages/:userId/attachments` | member · write limit | sendAttachment |
| GET | `/api/push/key` | public | key |
| POST | `/api/push/subscriptions` | member | subscribe |
| DELETE | `/api/push/subscriptions` | member | unsubscribe |
| GET | `/api/gifs` | member | search |
| GET | `/api/notifications` | member | list |
| GET | `/api/notifications/badges` | member | badges |
| POST | `/api/notifications/read` | member | markRead |
| GET | `/api/search` | member | search |
| POST | `/api/reports` | member · write limit | create |
| POST | `/api/support` | member · write limit | a support request: `topic` (account, verification, jobs, safety, problem, other), `subject`, `message`, and for problems the `page`; at most 5 open at once |
| GET | `/api/support/mine` | member | the member's requests with replies |
| POST | `/api/support/:id/replies` | the member who asked | follow up (reopens the request) |
| GET | `/api/support/queue` | staff · `support:read` | requests by `status` (open by default) |
| POST | `/api/support/:id/answer` | staff · `support:answer` | reply with `text` and/or `close`; the member is notified, the action audited |
| GET | `/api/admin/stats` | staff · `stats:read` | live counts, `joined7`, `joined30`, `active7` and 12 weeks of sign-ups (`growth`) |
| GET | `/api/admin/users` | staff · `users:read` | users (`q`, `college`, `role`, `status`) |
| GET | `/api/admin/users/:id` | staff · `users:read` | one member: account state, reports about them, recent sign-ins, staff actions |
| PATCH | `/api/admin/users/:id/role` | staff · `roles:manage` | set `role`; never your own, never at or above your rank, never an `ADMIN_EMAIL` address |
| POST | `/api/admin/users/:id/status` | staff · `users:suspend` (ban and unban: `users:ban`) | `status` `suspended` (with `days` 1 to 365), `banned` or `active`, plus a `reason`; signs the account out everywhere |
| POST | `/api/admin/users/:id/verify` | staff · `users:verify` | verifyUser |
| DELETE | `/api/admin/users/:id/verify` | staff · `users:verify` | revokeUser |
| GET | `/api/admin/colleges` | staff · `colleges:manage` | colleges |
| PATCH | `/api/admin/colleges/:id` | staff · `colleges:manage` | updateCollege |
| GET | `/api/admin/reports` | staff · `reports:read` | reports |
| POST | `/api/admin/reports/:id/resolve` | staff · `reports:resolve` (removing an account: `users:ban`) | resolveReport |
| GET | `/api/admin/jobs` | staff · `jobs:moderate` | every job (`q`, `closed`) |
| DELETE | `/api/admin/jobs/:id` | staff · `jobs:moderate` | remove with a `reason`, which the poster is told |
| GET | `/api/admin/firms` | staff · `firms:moderate` | firms (`q`, `verified`) |
| PATCH | `/api/admin/firms/:id` | staff · `firms:moderate` | set the `verified` badge |
| DELETE | `/api/admin/firms/:id` | staff · `firms:moderate` | remove with a `reason`, which the owner is told |
| GET | `/api/admin/audit` | staff · `audit:read` | the audit log (`action` prefix, `actor`, `target`) |

## Roles

Site staff roles, each with every permission of the roles before it (`backend/src/config/permissions.js`):

| Role | Adds |
|---|---|
| `support` | `admin:access`, `users:read`, `reports:read`, `stats:read`, `support:read`, `support:answer` |
| `moderator` | `reports:resolve`, `users:suspend`, `jobs:moderate` |
| `admin` | `users:verify`, `users:ban`, `colleges:manage`, `firms:moderate`, `audit:read` (and `isAdmin`, which ownership checks across the API use) |
| `super_admin` | `roles:manage`. Addresses in `ADMIN_EMAIL` are always super admins. |

Hiring isn't a site role: a job's poster and its firm's owner and admins manage that job's applicants. The signed-in member's `permissions` come with `/api/auth/me`.
