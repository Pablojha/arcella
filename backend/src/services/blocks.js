import User from '../models/User.js';

/** Members hidden from `user` in either direction: people they blocked and people who blocked them. */
export async function hiddenIds(user) {
  const blockedMe = await User.find({ blocked: user._id }).distinct('_id');
  return [...(user.blocked ?? []), ...blockedMe];
}

export const isBlockedBetween = async (a, b) => Boolean(await User.exists({ $or: [{ _id: a, blocked: b }, { _id: b, blocked: a }] }));
