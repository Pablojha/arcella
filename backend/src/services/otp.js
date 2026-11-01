import crypto from 'node:crypto';
import Otp from '../models/Otp.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/errors.js';
import { codeEmail, mailConfigured, sendMail } from './mail.js';

const TTL_MS = 10 * 60 * 1000;
const RESEND_AFTER_MS = 30 * 1000;
const MAX_ATTEMPTS = 5;

const hash = (code) => crypto.createHash('sha256').update(code).digest('hex');

/** New accounts confirm their email whenever email can be delivered (always in development, where codes show on screen). */
export const signupNeedsCode = mailConfigured || !env.isProd;

const INTROS = {
  signup: () => 'Use this code to verify your email and finish creating your Arcella account:',
  reset: () => 'Use this code to choose a new password for your Arcella account:',
  college: (college) => `Use this code to verify your membership of ${college}:`,
};

/**
 * Emails a fresh code. Resolves to `{ recent: true }` (nothing sent) when a code went out less than
 * 30 seconds ago, and to `{ devCode }` in development when no email provider is configured.
 */
export async function sendCode(email, purpose, context) {
  if (await Otp.exists({ email, purpose, sentAt: { $gt: new Date(Date.now() - RESEND_AFTER_MS) } })) return { recent: true };
  const code = String(crypto.randomInt(100000, 1000000));
  const now = Date.now();
  await Otp.findOneAndUpdate({ email, purpose }, { codeHash: hash(code), attempts: 0, sentAt: new Date(now), expiresAt: new Date(now + TTL_MS) }, { upsert: true });
  if (await sendMail({ to: email, subject: `${code} is your Arcella code`, html: codeEmail(code, INTROS[purpose](context)) })) return {};
  if (env.isProd) throw new ApiError(503, 'Email is not set up yet, so we could not send your code. Please try again later.');
  console.log(`[dev] ${purpose} code for ${email}: ${code}`);
  return { devCode: code };
}

/** Like `sendCode`, but asking again within 30 seconds is an error the user sees. */
export async function resendCode(email, purpose, context) {
  const result = await sendCode(email, purpose, context);
  if (result.recent) throw new ApiError(429, 'A code was sent a moment ago. Please wait a few seconds before asking again.');
  return result;
}

/** Accepts a correct, unexpired code once; wrong codes count towards a limit of 5 attempts. */
export async function checkCode(email, purpose, code) {
  const otp = await Otp.findOne({ email, purpose });
  if (!otp || otp.expiresAt < new Date()) throw new ApiError(400, 'This code has expired. Please request a new one.');
  if (otp.attempts >= MAX_ATTEMPTS) throw new ApiError(429, 'Too many wrong attempts. Please request a new code.');
  if (otp.codeHash !== hash(code)) {
    otp.attempts += 1;
    await otp.save();
    const left = MAX_ATTEMPTS - otp.attempts;
    throw new ApiError(400, left ? `That code is not right. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Too many wrong attempts. Please request a new code.');
  }
  await otp.deleteOne();
}
