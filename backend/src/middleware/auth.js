import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { ApiError } from '../utils/errors.js';

export const signToken = (user) => jwt.sign({ id: user._id }, env.jwtSecret, { expiresIn: env.jwtExpires });

/** The account a session token belongs to; expired tokens, deleted accounts and sessions older than a password change are refused. */
export async function userFromToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new ApiError(401, 'Your session has expired, please log in again');
  }
  const user = await User.findById(payload.id).select('+blocked');
  if (!user) throw new ApiError(401, 'Account not found, please log in again');
  if (user.passwordChangedAt && payload.iat * 1000 < user.passwordChangedAt.getTime() - 1000) {
    throw new ApiError(401, 'Your password was changed, please log in again');
  }
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

export function adminOnly(req, res, next) {
  if (!req.user?.isAdmin) throw new ApiError(403, 'Only site admins can do this');
  next();
}
