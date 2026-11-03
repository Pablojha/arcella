import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

const limiter = (limit, minutes, message, options = {}) =>
  rateLimit({ windowMs: minutes * 60_000, limit, standardHeaders: 'draft-7', legacyHeaders: false, message: { message }, ...options });

/** Sign-up, sign-in and code checks per IP: 30 per 15 minutes unless AUTH_RATE_LIMIT says otherwise (tests). */
export const authLimiter = limiter(env.authRateLimit, 15, 'Too many attempts. Please wait a few minutes and try again.');

/** These run after `auth`, so limits apply per account rather than per (shared campus) IP. */
const perAccount = { keyGenerator: (req) => String(req.user._id) };

export const otpLimiter = limiter(8, 15, 'Too many code requests. Please wait a few minutes.', perAccount);

export const exportLimiter = limiter(5, 60, 'You can download your data a few times an hour. Please try again later.', perAccount);

/** Anti-spam cap on posting, commenting, messaging and reporting. */
export const writeLimiter = limiter(60, 1, "You're doing that too fast. Please slow down for a minute.", perAccount);
