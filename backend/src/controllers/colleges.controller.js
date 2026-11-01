import College from '../models/College.js';
import User from '../models/User.js';
import { CARD } from '../config/constants.js';
import { assertMember, isMember, isModerator } from '../utils/access.js';
import { found } from '../utils/errors.js';
import { escapeRegex, searchRegex, uniqueSlug } from '../utils/text.js';

export async function list(req, res) {
  const { q } = req.query;
  const filter = q ? { $or: ['name', 'short', 'city'].map((field) => ({ [field]: searchRegex(q) })) } : {};
  const items = await College.find(filter).select('name short city state domains').sort({ name: 1 }).limit(q ? 40 : 300).lean();
  res.json({ items });
}

/** Adds a college missing from the list (or returns the existing one with the same name). */
export async function create(req, res) {
  const existing = await College.findOne({ name: new RegExp(`^${escapeRegex(req.body.name)}$`, 'i') }).lean();
  if (existing) return res.json(existing);
  const college = await College.create({ ...req.body, slug: await uniqueSlug(College, req.body.name), userAdded: true, addedBy: req.user._id });
  res.status(201).json(college);
}

export async function get(req, res) {
  const college = found(await College.findById(req.params.id).select('-addedBy').populate('moderators', CARD).lean(), 'College');
  const [membersCount, moderator] = await Promise.all([
    User.countDocuments({ college: college._id, verified: true }),
    isModerator(req.user, college._id),
  ]);
  res.json({ ...college, membersCount, member: isMember(req.user, college._id), moderator });
}

/** Verified members grouped as Faculty first, then by batch (newest first). */
export async function members(req, res) {
  assertMember(req.user, req.params.id);
  const users = await User.find({ college: req.params.id, verified: true }).select(`${CARD} batch collegeRole`).sort({ batch: -1, name: 1 }).lean();
  const groups = new Map([['Faculty', []]]);
  for (const user of users) {
    const title = user.collegeRole === 'faculty' ? 'Faculty' : `Batch ${user.batch ?? 'not set'}`;
    if (!groups.has(title)) groups.set(title, []);
    groups.get(title).push(user);
  }
  res.json({ groups: [...groups].filter(([, list]) => list.length).map(([title, list]) => ({ title, members: list })) });
}
