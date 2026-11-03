import jwt from 'jsonwebtoken';
import Device from '../models/Device.js';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { hasPermission } from '../config/permissions.js';
import { ApiError } from '../utils/errors.js';

const ALGORITHM = 'HS256';
const TOUCH_MS = 5 * 60_000;

/** A session token for one signed-in device (`sid`). */
export const signToken = (user, device) => jwt.sign({ id: user._id, sid: String(device) }, env.jwtSecret, { algorithm: ALGORITHM, expiresIn: env.jwtExpires });

/** Proof that the password was right, good for 5 minutes and only for the two-factor step. */
export const signTicket = (user) => jwt.sign({ id: user._id, purpose: 'two_factor' }, env.jwtSecret, { algorithm: ALGORITHM, expiresIn: '5m' });

export function verifyTicket(ticket) {
  try {
    const payload = jwt.verify(ticket, env.jwtSecret, { algorithms: [ALGORITHM] });
    if (payload.purpose === 'two_factor') return payload.id;
  } catch {
    // Expired or forged: answered below.
  }
  throw new ApiError(401, 'This sign-in took too long. Please enter your password again.');
}

/**
 * The account a session token belongs to. Refused: expired or other-purpose tokens, deleted accounts, sessions older
 * than a password change, and signed-out devices. Tokens from before devices existed (no `sid`) end at "sign out
 * other devices". The device's id is kept on `user.$locals.device`.
 */
export async function userFromToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret, { algorithms: [ALGORITHM] });
  } catch {
    throw new ApiError(401, 'Your session has expired, please log in again');
  }
  if (payload.purpose) throw new ApiError(401, 'Please log in to continue');
  const [user, device] = await Promise.all([User.findById(payload.id).select('+blocked'), payload.sid && Device.findOne({ _id: payload.sid, user: payload.id }).select('lastSeenAt').lean()]);
  if (!user) throw new ApiError(401, 'Account not found, please log in again');
  const issued = payload.iat * 1000;
  if (user.passwordChangedAt && issued < user.passwordChangedAt.getTime() - 1000) {
    throw new ApiError(401, 'Your password was changed, please log in again');
  }
  // Before the device check: suspending signs out every device, and the member should see why.
  const blocked = user.blockedReason();
  if (blocked) throw new ApiError(401, blocked);
  if (payload.sid ? !device : user.signedOutAt && issued < user.signedOutAt.getTime()) throw new ApiError(401, 'This device was signed out, please log in again');
  if (device && Date.now() - device.lastSeenAt > TOUCH_MS) Device.updateOne({ _id: device._id }, { lastSeenAt: new Date() }).catch(() => {});
  user.$locals.device = payload.sid;
  return user;
}

const authenticate = (required) => async (req, res, next) => {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (!token) {
    if (required) throw new ApiError(401, 'Please log in to continue');
    return next();
  }
  req.user = await userFromToken(token);
  next();
};

export const auth = authenticate(true);
export const optionalAuth = authenticate(false);

/** Lets the request through only if the member's staff role grants `permission` (see config/permissions.js). */
export const can = (permission) => (req, res, next) => {
  if (!hasPermission(req.user, permission)) throw new ApiError(403, "Your role doesn't allow this");
  next();
};
