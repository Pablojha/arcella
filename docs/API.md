# Arcella API

The REST API behind the website and app: Express 5 on Render, at `https://arcella-api-pablojha.onrender.com` (locally `http://localhost:5000`). Every path starts with `/api`.

## Conventions

- **Auth:** sign up or log in to get a token, then send `Authorization: Bearer <token>`. Tokens are HS256 JWTs valid for 30 days (`JWT_EXPIRES`), and they stop working when the password changes or the account is deleted. No cookies are used, so CSRF doesn't apply.
- **Access** in the table below means: *public* (anyone), *member* (any signed-in account; ownership and role checks happen inside the handler), and *admin* (site admins only). College groups additionally require verified membership of that college.
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
| `presence` | client → server | `{ visible, chat, endpoint }`, so notifications skip a chat being read or a screen that is on (optional ack) |

## Push notifications

`GET /api/push/key` returns the public VAPID key (or `null` when push isn't configured). `POST /api/push/subscriptions` saves the browser's subscription `{ endpoint, keys: { p256dh, auth } }` for the signed-in member; only Google, Mozilla, Apple and Microsoft push endpoints are accepted. `DELETE` with `{ endpoint }` removes it (sent on sign-out).

## Endpoints

| Method | Path | Access | Handler |
| --- | --- | --- | --- |
| GET | `/api/health` | public | health check |
| POST | `/api/auth/register` | public · auth limit | register |
| POST | `/api/auth/login` | public · auth limit | login |
| POST | `/api/auth/verify-email` | public · auth limit | verifyEmail |
| POST | `/api/auth/resend-code` | public · auth limit | resendSignupCode |
| POST | `/api/auth/forgot` | public · auth limit | forgotPassword |
| POST | `/api/auth/reset` | public · auth limit | resetPassword |
| GET | `/api/auth/me` | member | me |
| PATCH | `/api/auth/password` | member · auth limit | changePassword |
| GET | `/api/users` | member | search |
| GET | `/api/users/suggestions` | member | suggestions |
| PATCH | `/api/users/me` | member | updateMe |
| DELETE | `/api/users/me` | member | deleteMe |
| GET | `/api/users/me/blocked` | member | blockedList |
| GET | `/api/users/me/export` | member | exportMe (JSON file download, 5 an hour) |
| POST | `/api/users/me/avatar` | member | updateImage |
| POST | `/api/users/me/cover` | member | updateImage |
| GET | `/api/users/:id` | member | profile |
| POST | `/api/users/:id/block` | member | toggleBlock |
| GET | `/api/connections` | member | list |
| GET | `/api/connections/requests` | member | requests |
| POST | `/api/connections/:userId` | member · write limit | send |
| POST | `/api/connections/:userId/accept` | member | accept |
| DELETE | `/api/connections/:userId` | member | remove |
| GET | `/api/posts` | member | feed |
| POST | `/api/posts` | member · write limit | create |
| GET | `/api/posts/:id` | member | get |
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
| GET | `/api/jobs` | member | list |
| POST | `/api/jobs` | member | create |
| GET | `/api/jobs/:id` | member | get |
| DELETE | `/api/jobs/:id` | member | remove |
| GET | `/api/firms` | member | list |
| POST | `/api/firms` | member | create |
| GET | `/api/firms/:slug` | member | get |
| PATCH | `/api/firms/:id` | member | update |
| POST | `/api/firms/:id/follow` | member | follow |
| POST | `/api/firms/:id/work` | member | work |
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
| POST | `/api/colleges/:id/chat` | member · write limit | inline |
| DELETE | `/api/colleges/:id/chat/:messageId` | member | inline |
| GET | `/api/verification/me` | member | mine |
| POST | `/api/verification/email/send` | member · code limit | sendCode |
| POST | `/api/verification/email/confirm` | member · code limit | confirmCode |
| POST | `/api/verification/document` | member | uploadDocument |
| GET | `/api/verification/queue` | member | queue |
| GET | `/api/verification/:id/document` | member | document |
| POST | `/api/verification/:id/review` | member | review |
| GET | `/api/messages` | member | conversations |
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
| GET | `/api/admin/stats` | admin | stats |
| GET | `/api/admin/users` | admin | users |
| POST | `/api/admin/users/:id/verify` | admin | verifyUser |
| DELETE | `/api/admin/users/:id/verify` | admin | revokeUser |
| GET | `/api/admin/colleges` | admin | colleges |
| PATCH | `/api/admin/colleges/:id` | admin | updateCollege |
| GET | `/api/admin/reports` | admin | reports |
| POST | `/api/admin/reports/:id/resolve` | admin | resolveReport |
