import College from '../models/College.js';
import User from '../models/User.js';
import Verification from '../models/Verification.js';
import { notify } from './notify.js';

/** Takes away a user's admin and co-admin roles in every college except `keep` (in all of them when omitted). */
export async function dropCollegeRoles(userId, keep) {
  const others = keep ? { _id: { $ne: keep } } : {};
  await Promise.all(['admin', 'coAdmin'].map((role) => College.updateMany({ ...others, [role]: userId }, { $unset: { [role]: 1 } })));
}

/** Makes a user a verified member of a college, closes their other open requests and tells them. */
export async function grantMembership(userId, { college, role, batch }, actor) {
  await User.updateOne(
    { _id: userId },
    { college, collegeRole: role, batch: role === 'faculty' ? null : batch, type: role, verified: true },
  );
  await dropCollegeRoles(userId, college);
  await Verification.deleteMany({ user: userId, status: 'pending' });
  await notify({ user: userId, actor, type: 'verify_approved', link: '/college' });
}
