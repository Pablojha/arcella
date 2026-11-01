import crypto from 'node:crypto';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { signToken } from '../middleware/auth.js';
import { mailConfigured, resetEmail, sendMail } from '../services/mail.js';
import { profileOf } from '../services/profile.js';
import { ApiError } from '../utils/errors.js';

const RESET_TTL_MS = 30 * 60 * 1000;
const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex');
const session = async (user) => ({ token: signToken(user), user: await profileOf(user) });

export async function register(req, res) {
  const { name, email, password, type } = req.body;
  if (await User.exists({ email })) throw new ApiError(409, 'An account with this email already exists. Try logging in.');
  const user = await User.create({ name, email, password, type, isAdmin: env.adminEmails.includes(email) });
  res.status(201).json(await session(user));
}

export async function login(req, res) {
  const user = await User.findOne({ email: req.body.email }).select('+password');
  if (!user || !(await user.checkPassword(req.body.password))) throw new ApiError(401, 'Wrong email or password');
  if (!user.isAdmin && env.adminEmails.includes(user.email)) {
    user.isAdmin = true;
    await user.save();
  }
  res.json(await session(user));
}

export const me = async (req, res) => res.json({ user: await profileOf(req.user) });

/** Emails a 30-minute reset link. Answers the same way whether or not the account exists. */
export async function forgotPassword(req, res) {
  if (env.isProd && !mailConfigured) throw new ApiError(503, 'Password reset by email is not set up yet. Please contact an admin.');
  const user = await User.findOne({ email: req.body.email });
  let devLink;
  if (user) {
    const token = crypto.randomBytes(32).toString('hex');
    await User.updateOne({ _id: user._id }, { resetHash: hashToken(token), resetExpires: new Date(Date.now() + RESET_TTL_MS) });
    const link = `${env.appUrl}/reset?token=${token}`;
    if (!(await sendMail({ to: user.email, subject: 'Reset your Arcella password', html: resetEmail(link) }))) {
      console.log(`[dev] Password reset link for ${user.email}: ${link}`);
      devLink = link;
    }
  }
  res.json({ ok: true, ...(devLink && { devLink }) });
}

export async function resetPassword(req, res) {
  const user = await User.findOne({ resetHash: hashToken(req.body.token), resetExpires: { $gt: new Date() } });
  if (!user) throw new ApiError(400, 'This reset link is invalid or has expired. Please request a new one.');
  user.set({ password: req.body.password, resetHash: undefined, resetExpires: undefined });
  await user.save();
  res.json(await session(user));
}

/** Changes the password, which signs out every other device; the caller gets a fresh token. */
export async function changePassword(req, res) {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.checkPassword(req.body.current))) throw new ApiError(400, 'Your current password is not right');
  user.password = req.body.password;
  await user.save();
  res.json({ token: signToken(user) });
}
