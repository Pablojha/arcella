import Device from '../models/Device.js';
import LoginEvent from '../models/LoginEvent.js';
import { signToken } from '../middleware/auth.js';
import { ApiError } from '../utils/errors.js';
import { noticeEmail, sendMail } from './mail.js';
import { notify } from './notify.js';

const MAX_FAILURES = 5;
const LOCK_MINUTES = 15;

const client = (req) => ({ agent: req.get('user-agent')?.slice(0, 300), ip: req.ip });

/**
 * Refuses sign-in after 5 failed attempts within 15 minutes (counted since the last success), on top of the per-IP
 * limit, so one account can't be guessed at from many addresses. The lock lifts by itself; a password reset is the
 * way in meanwhile.
 */
export async function assertNotLocked(user, req) {
  const since = new Date(Date.now() - LOCK_MINUTES * 60_000);
  const lastOk = await LoginEvent.findOne({ user: user._id, ok: true, createdAt: { $gte: since } }).sort({ _id: -1 }).select('_id').lean();
  const failures = await LoginEvent.countDocuments({ user: user._id, ok: false, reason: { $ne: 'locked' }, createdAt: { $gte: since }, ...(lastOk && { _id: { $gt: lastOk._id } }) });
  if (failures < MAX_FAILURES) return;
  await LoginEvent.create({ user: user._id, ok: false, reason: 'locked', ...client(req) });
  throw new ApiError(429, `Too many failed sign-ins. Try again in ${LOCK_MINUTES} minutes, or reset your password.`);
}

export const recordFailure = (user, req, reason) => LoginEvent.create({ user: user._id, ok: false, reason, ...client(req) });

/** Tells the member when their account is signed in from a browser or app it hasn't used in the last 90 days. */
async function alertIfNewDevice(user, { agent }) {
  const seen = await LoginEvent.find({ user: user._id, ok: true }).select('agent').limit(200).lean();
  if (!seen.length || seen.some((event) => event.agent === agent)) return;
  await notify({ user: user._id, type: 'new_login', text: agent, link: '/settings?section=security' });
  const text = 'Your Arcella account was just signed in on a new device. If this was you, there is nothing to do. If not, reset your password and sign out other devices in Settings → Security.';
  await sendMail({ to: user.email, subject: 'New sign-in to your Arcella account', html: noticeEmail(text) }).catch(() => {});
}

/** A successful sign-in: records it, registers the device and returns its session token. */
export async function startSession(user, req) {
  const info = client(req);
  await alertIfNewDevice(user, info);
  const [device] = await Promise.all([Device.create({ user: user._id, ...info }), LoginEvent.create({ user: user._id, ok: true, ...info })]);
  return signToken(user, device._id);
}

/** Signs out every device, optionally keeping one (the device asking); older tokens without a device stop working too. */
export async function signOutDevices(user, keep) {
  await Device.deleteMany({ user: user._id, ...(keep && { _id: { $ne: keep } }) });
  user.signedOutAt = new Date();
}
