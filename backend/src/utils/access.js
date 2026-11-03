import College from '../models/College.js';
import { ApiError } from './errors.js';
import { same } from './shape.js';

const idOf = (value) => value?._id ?? value;

/** The colleges whose private groups the user belongs to: those of their verified memberships. */
export function memberCollegeIds(user) {
  const ids = (user.memberships ?? []).filter((entry) => entry.verified).map((entry) => idOf(entry.college));
  return ids.filter((id, index) => ids.findIndex((other) => same(other, id)) === index);
}

/** Whether the user is a verified member of the college. */
export const belongsTo = (user, collegeId) => memberCollegeIds(user).some((id) => same(id, collegeId));

/** Filter for the users who are verified members of a college. */
export const membersOf = (college) => ({ memberships: { $elemMatch: { college, verified: true } } });

/** Verified members, and site admins, can see a college's group. */
export const isMember = (user, collegeId) => user.isAdmin || belongsTo(user, collegeId);

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
