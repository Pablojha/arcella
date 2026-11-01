import College from '../models/College.js';
import { ApiError } from './errors.js';
import { same } from './shape.js';

export const isMember = (user, collegeId) => user.isAdmin || (user.verified && same(user.college, collegeId));

export function assertMember(user, collegeId) {
  if (!isMember(user, collegeId)) throw new ApiError(403, 'Only verified members of this college can see this');
}

/** Filter for the colleges a user runs as their admin or co-admin. */
export const runBy = (userId) => ({ $or: [{ admin: userId }, { coAdmin: userId }] });

/** A college's admin and co-admin run its group; site admins run every group. */
export const isModerator = async (user, collegeId) => user.isAdmin || Boolean(collegeId && (await College.exists({ _id: collegeId, ...runBy(user._id) })));

export async function assertModerator(user, collegeId) {
  if (!(await isModerator(user, collegeId))) throw new ApiError(403, 'Only college admins can do this');
}

/** Owners and site admins may manage content; college admins too when it belongs to their college. */
export async function assertCanManage(user, ownerId, collegeId) {
  if (same(user._id, ownerId) || (await isModerator(user, collegeId))) return;
  throw new ApiError(403, "You don't have permission to do this");
}
