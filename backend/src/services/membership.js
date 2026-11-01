import User from '../models/User.js';
import Verification from '../models/Verification.js';
import { notify } from './notify.js';

/** Makes a user a verified member of a college, closes their other open requests and tells them. */
export async function grantMembership(userId, { college, role, batch }, actor) {
  await User.updateOne(
    { _id: userId },
    { college, collegeRole: role, batch: role === 'faculty' ? null : batch, type: role, verified: true },
  );
  await Verification.deleteMany({ user: userId, status: 'pending' });
  await notify({ user: userId, actor, type: 'verify_approved', link: '/college' });
}
