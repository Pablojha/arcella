import crypto from 'node:crypto';
import Device from '../models/Device.js';
import LoginEvent from '../models/LoginEvent.js';
import PushSubscription from '../models/PushSubscription.js';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { signTicket, signToken, verifyTicket } from '../middleware/auth.js';
import { mailConfigured } from '../services/mail.js';
import { checkCode, resendCode, sendCode, signupNeedsCode } from '../services/otp.js';
import { profileOf } from '../services/profile.js';
import { disconnectDevices } from '../services/realtime.js';
import { assertNotLocked, recordFailure, signOutDevices, startSession } from '../services/security.js';
import { matchStep, newSecret, otpauthUrl } from '../services/totp.js';
import { ApiError, found } from '../utils/errors.js';

const session = async (user, req) => ({ token: await startSession(user, req), user: await profileOf(user) });

/** Instead of a session, tells the app to show the "enter your code" step. */
const verificationStep = async (user) => ({ verify: true, email: user.email, ...(await sendCode(user.email, 'signup')) });

const needsCode = (user) => signupNeedsCode && !user.emailVerified;

/** Admin rights come from the ADMIN_EMAIL list, but only for an address its owner proved with a one-time code. */
function grantAdminIfListed(user) {
  if (user.emailVerified && user.role !== 'super_admin' && env.adminEmails.includes(user.email)) user.role = 'super_admin';
}

/** Suspended and banned members get the reason instead of a session (only once their password proved it's them). */
function assertUsable(user) {
  const blocked = user.blockedReason();
  if (blocked) throw new ApiError(403, blocked);
}

const SECOND_FACTOR = '+twoFactor.secret +twoFactor.lastStep +twoFactor.recovery';
const hashCode = (code) => crypto.createHash('sha256').update(code.toLowerCase()).digest('hex');

/**
 * Checks an authenticator code (each one works once) or a recovery code (each one works once), using it up. Returns
 * false for anything else. Needs the user loaded with SECOND_FACTOR.
 */
async function useSecondFactor(user, code) {
  const { secret, lastStep = 0, recovery = [] } = user.twoFactor;
  if (/^\d{6}$/.test(code)) {
    const step = matchStep(secret, code);
    if (step === null || step <= lastStep) return false;
    return (await User.updateOne({ _id: user._id, $or: [{ 'twoFactor.lastStep': { $lt: step } }, { 'twoFactor.lastStep': null }] }, { 'twoFactor.lastStep': step })).modifiedCount === 1;
  }
  const hash = hashCode(code);
  if (!recovery.includes(hash)) return false;
  return (await User.updateOne({ _id: user._id, 'twoFactor.recovery': hash }, { $pull: { 'twoFactor.recovery': hash } })).modifiedCount === 1;
}

/**
 * Creates the account. An unconfirmed one is refreshed so the real owner of the email can finish signing up, but
 * only while codes are on: without them nothing proves ownership, so an existing account is never taken over.
 */
export async function register(req, res) {
  const { name, email, password, type } = req.body;
  const existing = await User.findOne({ email });
  if (existing && (existing.emailVerified || !signupNeedsCode)) throw new ApiError(409, 'An account with this email already exists. Try logging in.');
  const user = existing ?? new User({ email });
  user.set({ name, password, type, termsAcceptedAt: new Date() });
  await user.save();
  res.status(201).json(needsCode(user) ? await verificationStep(user) : await session(user, req));
}

/** Checks the password; accounts with two-factor on get a short-lived ticket for the code step instead of a session. */
export async function login(req, res) {
  const user = await User.findOne({ email: req.body.email }).select('+password');
  if (!user) throw new ApiError(401, 'Wrong email or password');
  await assertNotLocked(user, req);
  if (!(await user.checkPassword(req.body.password))) {
    await recordFailure(user, req, 'password');
    throw new ApiError(401, 'Wrong email or password');
  }
  assertUsable(user);
  if (needsCode(user)) return res.json(await verificationStep(user));
  grantAdminIfListed(user);
  if (user.isModified('role')) await user.save();
  if (user.twoFactor?.enabled) return res.json({ twoFactor: true, ticket: signTicket(user) });
  res.json(await session(user, req));
}

export async function twoFactorLogin(req, res) {
  const user = found(await User.findById(verifyTicket(req.body.ticket)).select(SECOND_FACTOR), 'Account');
  await assertNotLocked(user, req);
  if (!user.twoFactor?.enabled || !(await useSecondFactor(user, req.body.code))) {
    await recordFailure(user, req, 'two_factor');
    throw new ApiError(401, "That code didn't work. Check your authenticator app and try again.");
  }
  assertUsable(user);
  res.json(await session(user, req));
}

export const me = async (req, res) => res.json({ user: await profileOf(req.user) });

export async function verifyEmail(req, res) {
  const { email, code } = req.body;
  const user = found(await User.findOne({ email }), 'Account');
  if (user.emailVerified) throw new ApiError(400, 'This email is already verified. Please log in.');
  await checkCode(email, 'signup', code);
  user.emailVerified = true;
  grantAdminIfListed(user);
  await user.save();
  res.json(await session(user, req));
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

/**
 * A correct code proves the inbox, so it also confirms the email. Every device is signed out and stops getting
 * pushes. Two-factor sign-in stays on: the reset proves the inbox, not the phone.
 */
export async function resetPassword(req, res) {
  const { email, code, password } = req.body;
  await checkCode(email, 'reset', code);
  const user = found(await User.findOne({ email }), 'Account');
  user.set({ password, emailVerified: true });
  grantAdminIfListed(user);
  disconnectDevices(await Device.find({ user: user._id }).distinct('_id'), user._id);
  await signOutDevices(user);
  await user.save();
  await PushSubscription.deleteMany({ user: user._id });
  assertUsable(user);
  if (user.twoFactor?.enabled) return res.json({ twoFactor: true, ticket: signTicket(user) });
  res.json(await session(user, req));
}

/** Changes the password, which signs out every other device (and their pushes); this device gets a fresh token. */
export async function changePassword(req, res) {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.checkPassword(req.body.current))) throw new ApiError(400, 'Your current password is not right');
  user.password = req.body.password;
  const current = req.user.$locals.device;
  disconnectDevices(await Device.find({ user: user._id, _id: { $ne: current } }).distinct('_id'), user._id);
  await Device.deleteMany({ user: user._id, ...(current && { _id: { $ne: current } }) });
  await user.save();
  await PushSubscription.deleteMany({ user: user._id });
  res.json({ token: current ? signToken(user, current) : await startSession(user, req) });
}

export async function logout(req, res) {
  const current = req.user.$locals.device;
  if (current) {
    await Device.deleteOne({ _id: current });
    disconnectDevices([current]);
  }
  res.json({ ok: true });
}

export async function devices(req, res) {
  const items = await Device.find({ user: req.user._id }).sort({ lastSeenAt: -1 }).select('agent ip createdAt lastSeenAt').lean();
  res.json({ items: items.map((device) => ({ ...device, current: String(device._id) === String(req.user.$locals.device) })) });
}

export async function removeDevice(req, res) {
  found(await Device.findOneAndDelete({ _id: req.params.id, user: req.user._id }), 'Device');
  disconnectDevices([req.params.id]);
  res.json({ ok: true });
}

/**
 * Signs out everywhere else, including tokens from before devices existed. The caller gets a token for this device
 * (made now if theirs was one of those older tokens).
 */
export async function signOutOthers(req, res) {
  const user = await User.findById(req.user._id);
  const current = req.user.$locals.device ?? (await Device.create({ user: user._id, agent: req.get('user-agent')?.slice(0, 300), ip: req.ip }))._id;
  disconnectDevices(await Device.find({ user: user._id, _id: { $ne: current } }).distinct('_id'), user._id);
  await signOutDevices(user, current);
  await user.save();
  res.json({ token: signToken(user, current) });
}

export async function history(req, res) {
  const items = await LoginEvent.find({ user: req.user._id }).sort({ _id: -1 }).limit(20).select('ok reason agent createdAt').lean();
  res.json({ items });
}

/** Starts two-factor setup with a new secret; nothing changes until a code from the app confirms it. */
export async function setupTwoFactor(req, res) {
  if (req.user.twoFactor?.enabled) throw new ApiError(409, 'Two-factor sign-in is already on');
  const secret = newSecret();
  await User.updateOne({ _id: req.user._id }, { 'twoFactor.pending': secret });
  res.json({ secret, url: otpauthUrl(secret, req.user.email) });
}

export async function enableTwoFactor(req, res) {
  const user = await User.findById(req.user._id).select('+twoFactor.pending');
  const secret = user.twoFactor?.pending;
  if (!secret) throw new ApiError(400, 'Start the setup again');
  const step = matchStep(secret, req.body.code);
  if (step === null) throw new ApiError(400, "That code didn't match. Check the key in your app and try again.");
  const recoveryCodes = Array.from({ length: 8 }, () => crypto.randomBytes(4).toString('hex').replace(/^(.{4})/, '$1-'));
  user.twoFactor = { enabled: true, secret, lastStep: step, recovery: recoveryCodes.map(hashCode) };
  await user.save();
  res.json({ recoveryCodes });
}

export async function disableTwoFactor(req, res) {
  const user = await User.findById(req.user._id).select(`+password ${SECOND_FACTOR}`);
  if (!(await user.checkPassword(req.body.password))) throw new ApiError(400, 'Your password is not right');
  if (!user.twoFactor?.enabled || !(await useSecondFactor(user, req.body.code))) throw new ApiError(400, "That code didn't work");
  await User.updateOne({ _id: user._id }, { $unset: { twoFactor: 1 } });
  res.json({ ok: true });
}
