import College from '../models/College.js';
import User from '../models/User.js';
import Verification from '../models/Verification.js';
import { belongsTo } from '../utils/access.js';
import { ApiError, found } from '../utils/errors.js';
import { same } from '../utils/shape.js';
import { notify } from './notify.js';

/** Takes away a user's admin and co-admin roles in one college, or in every college when none is given. */
export async function dropCollegeRoles(userId, college) {
  const where = college ? { _id: college } : {};
  await Promise.all(['admin', 'coAdmin'].map((role) => College.updateMany({ ...where, [role]: userId }, { $unset: { [role]: 1 } })));
}

/** The details a membership keeps: faculty have no degree level, degree or years. */
const detailsOf = ({ college, role, level, degree, batch, graduation }) =>
  role === 'faculty'
    ? { college: college?._id ?? college, role, level: undefined, degree: undefined, batch: undefined, graduation: undefined }
    : { college: college?._id ?? college, role, level, degree: degree || undefined, batch, graduation };

/** Two memberships are the same when they share the college and degree level, or are both teaching posts there. */
export const sameMembership = (a, b) =>
  same(a.college, b.college) && (a.role === 'faculty' || b.role === 'faculty' ? a.role === b.role : (a.level ?? null) === (b.level ?? null));

function assertUnique(user, details, except) {
  if (user.memberships.some((entry) => entry !== except && sameMembership(entry, details))) {
    throw new ApiError(409, details.role === 'faculty' ? 'This college is already in your education' : 'This college and degree level are already in your education');
  }
}

/** Mirrors the primary membership in the user's college fields (cards and profiles show it): `entry`, else the first verified one. */
function setPrimary(user, entry = user.memberships.find((item) => item.verified)) {
  user.memberships.forEach((item) => item.set('primary', item === entry));
  if (entry) user.set({ college: entry.college, collegeRole: entry.role, batch: entry.batch, verified: true, type: entry.role });
  else user.set({ college: undefined, collegeRole: undefined, batch: undefined, verified: false });
}

function membershipOf(user, id) {
  return found(user.memberships.id(id), 'College in your education');
}

/** Adds a college to the member's education, not yet verified. Returns the new membership. */
export async function addMembership(user, input) {
  const details = detailsOf(input);
  assertUnique(user, details);
  const entry = user.memberships.create(details);
  user.memberships.push(entry);
  await user.save();
  return entry;
}

/**
 * Edits a membership (the college stays). Once verified, its batch and faculty status stay as verified, since they
 * decide who can see and message whom; students can still become alumni, and the degree details stay editable.
 */
export async function updateMembership(user, id, input) {
  const entry = membershipOf(user, id);
  const details = detailsOf({ ...input, college: entry.college });
  if (entry.verified && ((details.role === 'faculty') !== (entry.role === 'faculty') || (details.batch ?? null) !== (entry.batch ?? null))) {
    throw new ApiError(400, "A verified college's batch and faculty status can't be changed. Remove it and verify again instead.");
  }
  assertUnique(user, details, entry);
  entry.set(details);
  if (entry.primary) setPrimary(user, entry);
  await user.save();
}

/** Removes a college from the member's education; a verified one also leaves that college's group. */
export async function removeMembership(user, id) {
  const entry = membershipOf(user, id);
  user.memberships.pull(entry._id);
  if (entry.primary) setPrimary(user);
  await user.save();
  if (entry.verified && !belongsTo(user, entry.college)) await dropCollegeRoles(user._id, entry.college);
}

/** Makes a verified membership the one shown on the member's cards and profile. */
export async function choosePrimary(user, id) {
  const entry = membershipOf(user, id);
  if (!entry.verified) throw new ApiError(400, 'Verify this college before making it your main one');
  setPrimary(user, entry);
  await user.save();
}

/**
 * Makes a user a verified member of a college, filling in the matching membership of their education (or adding it),
 * closes their other open requests for that college and tells them. Their first verified college becomes the primary one.
 */
export async function grantMembership(userId, request, actor) {
  const user = found(await User.findById(userId), 'User');
  const details = detailsOf(request);
  const entry = user.memberships.find((item) => sameMembership(item, details));
  if (entry) entry.set({ ...details, degree: details.degree ?? entry.degree, graduation: details.graduation ?? entry.graduation, verified: true });
  else user.memberships.push({ ...details, verified: true });
  if (!user.memberships.some((item) => item.primary && item.verified)) setPrimary(user);
  await user.save();
  await Verification.deleteMany({ user: userId, college: details.college, status: 'pending' });
  await notify({ user: userId, actor, type: 'verify_approved', link: `/college?id=${details.college}` });
}

/** Site admins withdraw all of a member's verifications: their colleges stay in their education, unverified. */
export async function revokeMemberships(userId) {
  const user = found(await User.findById(userId), 'User');
  user.memberships.forEach((entry) => entry.set('verified', false));
  setPrimary(user);
  await user.save();
  await dropCollegeRoles(userId);
}

/**
 * Members verified before several colleges were allowed have a single college: give them the matching membership.
 * Runs at start-up and changes nothing for members who already have memberships.
 */
export async function migrateMemberships() {
  const legacy = await User.find({ college: { $ne: null }, 'memberships.0': { $exists: false } }).select('college collegeRole batch verified').lean();
  if (!legacy.length) return 0;
  await User.bulkWrite(
    legacy.map(({ _id, college, collegeRole, batch, verified }) => ({
      updateOne: {
        filter: { _id, 'memberships.0': { $exists: false } },
        update: { $set: { memberships: [{ ...detailsOf({ college, role: collegeRole ?? 'student', batch }), verified: Boolean(verified), primary: Boolean(verified) }] } },
      },
    })),
  );
  return legacy.length;
}
