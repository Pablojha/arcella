import College from '../models/College.js';
import { PERMISSIONS } from '../config/permissions.js';
import { runBy } from '../utils/access.js';

/** The signed-in user's own profile, including private fields and the colleges they run as admin or co-admin. */
export async function profileOf(user) {
  await user.populate([
    { path: 'college', select: 'name short city' },
    { path: 'memberships.college', select: 'name short city state domains' },
  ]);
  const moderates = await College.find(runBy(user._id)).select('name short').lean();
  return { ...user.toJSON(), moderates, permissions: PERMISSIONS[user.role ?? 'user'] };
}
