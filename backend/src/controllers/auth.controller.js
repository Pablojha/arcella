import PushSubscription from '../models/PushSubscription.js';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { signToken } from '../middleware/auth.js';
import { mailConfigured } from '../services/mail.js';
import { checkCode, resendCode, sendCode, signupNeedsCode } from '../services/otp.js';
import { profileOf } from '../services/profile.js';
import { ApiError, found } from '../utils/errors.js';

const session = async (user) => ({ token: signToken(user), user: await profileOf(user) });

/** Instead of a session, tells the app to show the "enter your code" step. */
const verificationStep = async (user) => ({ verify: true, email: user.email, ...(await sendCode(user.email, 'signup')) });

const needsCode = (user) => signupNeedsCode && !user.emailVerified;

/** Creates the account, or refreshes an unconfirmed one so the real owner of the email can finish signing up. */
export async function register(req, res) {
  const { name, email, password, type } = req.body;
  const existing = await User.findOne({ email });
  if (existing?.emailVerified) throw new ApiError(409, 'An account with this email already exists. Try logging in.');
  const user = existing ?? new User({ email });
  user.set({ name, password, type, isAdmin: env.adminEmails.includes(email), emailVerified: !signupNeedsCode });
  await user.save();
  res.status(201).json(needsCode(user) ? await verificationStep(user) : await session(user));
}

export async function login(req, res) {
  const user = await User.findOne({ email: req.body.email }).select('+password');
  if (!user || !(await user.checkPassword(req.body.password))) throw new ApiError(401, 'Wrong email or password');
  if (needsCode(user)) return res.json(await verificationStep(user));
  if (!user.isAdmin && env.adminEmails.includes(user.email)) {
    user.isAdmin = true;
    await user.save();
  }
  res.json(await session(user));
}

export const me = async (req, res) => res.json({ user: await profileOf(req.user) });

export async function verifyEmail(req, res) {
  const { email, code } = req.body;
  const user = found(await User.findOne({ email }), 'Account');
  if (user.emailVerified) throw new ApiError(400, 'This email is already verified. Please log in.');
  await checkCode(email, 'signup', code);
  user.emailVerified = true;
  await user.save();
  res.json(await session(user));
}

/** Answers the same way whether or not an unconfirmed account exists for the email. */
export async function resendSignupCode(req, res) {
  const user = await User.findOne({ email: req.body.email });
  res.json({ ok: true, ...(user && !user.emailVerified ? await resendCode(user.email, 'signup') : {}) });
}

/** Emails a reset code; answers the same way whether or not the account exists. */
export async function forgotPassword(req, res) {
  if (env.isProd && !mailConfigured) throw new ApiError(503, 'Password reset by email is not set up yet. Please contact an admin.');
  const user = await User.findOne({ email: req.body.email });
  res.json({ ok: true, ...(user ? await resendCode(user.email, 'reset') : {}) });
}

/** A correct code proves the inbox, so it also confirms the email. Older sessions are signed out, and stop getting pushes. */
export async function resetPassword(req, res) {
  const { email, code, password } = req.body;
  await checkCode(email, 'reset', code);
  const user = found(await User.findOne({ email }), 'Account');
  user.set({ password, emailVerified: true });
  await user.save();
  await PushSubscription.deleteMany({ user: user._id });
  res.json(await session(user));
}

/** Changes the password, which signs out every other device (and their pushes); the caller gets a fresh token. */
export async function changePassword(req, res) {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.checkPassword(req.body.current))) throw new ApiError(400, 'Your current password is not right');
  user.password = req.body.password;
  await user.save();
  await PushSubscription.deleteMany({ user: user._id });
  res.json({ token: signToken(user) });
}
