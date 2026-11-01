import College from '../models/College.js';
import User from '../models/User.js';
import { CARD, COLLEGE_ADMINS } from '../config/constants.js';
import { notify } from '../services/notify.js';
import { assertMember, isMember, isModerator } from '../utils/access.js';
import { ApiError, found } from '../utils/errors.js';
import { same } from '../utils/shape.js';
import { escapeRegex, searchRegex, uniqueSlug } from '../utils/text.js';

const ROLE_NAMES = { admin: 'Admin', coAdmin: 'Co-admin' };

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
  const college = found(await College.findById(req.params.id).select('-addedBy').populate(COLLEGE_ADMINS).lean(), 'College');
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

/**
 * Gives a verified member the college's admin or co-admin role, or clears it (`user: null`). Site admins
 * choose both; a college admin chooses their own co-admin. One person cannot hold both roles.
 */
export async function setRole(req, res) {
  const { role, user } = req.body;
  const college = found(await College.findById(req.params.id), 'College');
  if (!req.user.isAdmin && !(role === 'coAdmin' && same(college.admin, req.user._id))) throw new ApiError(403, 'Only Arcella admins and the college admin can choose group admins');
  if (user) {
    const member = found(await User.findById(user).select('verified college'), 'User');
    if (!member.verified || !same(member.college, college._id)) throw new ApiError(400, 'Choose a verified member of this college');
    const other = role === 'admin' ? 'coAdmin' : 'admin';
    if (same(college[other], user)) {
      if (!req.user.isAdmin) throw new ApiError(400, 'That member is already the college admin');
      college[other] = undefined;
    }
  }
  college[role] = user ?? undefined;
  await college.save();
  if (user) await notify({ user, actor: req.user._id, type: 'college_role', text: `${ROLE_NAMES[role]} of ${college.name}`, link: '/college?tab=members' });
  await college.populate(COLLEGE_ADMINS);
  res.json({ admin: college.admin ?? null, coAdmin: college.coAdmin ?? null });
}
