import College from '../models/College.js';

/** The signed-in user's own profile, including private fields and the colleges they moderate. */
export async function profileOf(user) {
  await user.populate('college', 'name short city');
  const moderates = await College.find({ moderators: user._id }).select('name short').lean();
  return { ...user.toJSON(), moderates };
}
