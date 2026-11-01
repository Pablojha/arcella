import rateLimit from 'express-rate-limit';

const limiter = (limit, minutes, message, options = {}) =>
  rateLimit({ windowMs: minutes * 60_000, limit, standardHeaders: 'draft-7', legacyHeaders: false, message: { message }, ...options });

export const authLimiter = limiter(30, 15, 'Too many attempts. Please wait a few minutes and try again.');

/** These run after `auth`, so limits apply per account rather than per (shared campus) IP. */
const perAccount = { keyGenerator: (req) => String(req.user._id) };

export const otpLimiter = limiter(8, 15, 'Too many code requests. Please wait a few minutes.', perAccount);

/** Anti-spam cap on posting, commenting, messaging and reporting. */
export const writeLimiter = limiter(60, 1, "You're doing that too fast. Please slow down for a minute.", perAccount);
