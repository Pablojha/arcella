import Application from '../models/Application.js';
import Firm from '../models/Firm.js';
import Job, { openRoles } from '../models/Job.js';
import { CARD } from '../config/constants.js';
import { removeFiles, saveFile, saveFiles } from '../services/storage.js';
import { assertCanManage } from '../utils/access.js';
import { notify } from '../services/notify.js';
import { ApiError, found } from '../utils/errors.js';
import { paginate, toggle } from '../utils/query.js';
import { has, same, withCount } from '../utils/shape.js';
import { searchRegex, uniqueSlug } from '../utils/text.js';

export const FIRM_FILES = [
  { name: 'logo', maxCount: 1 },
  { name: 'cover', maxCount: 1 },
  { name: 'gallery', maxCount: 12 },
];

/** Saves uploaded logo/cover/gallery files onto the firm and returns the URLs they replaced. */
async function applyFiles(firm, files = {}) {
  const replaced = [];
  for (const field of ['logo', 'cover']) {
    const [file] = files[field] ?? [];
    if (!file) continue;
    replaced.push(firm[field]);
    firm[field] = await saveFile(file, 'firms');
  }
  if (files.gallery) firm.gallery.push(...(await saveFiles(files.gallery, 'firms')));
  return replaced;
}

export async function list(req, res) {
  const { q, city, mine } = req.query;
  const filter = {};
  // Firms the member can post roles for.
  if (mine) filter.$or = [{ owner: req.user._id }, { admins: req.user._id }];
  if (q) filter.name = searchRegex(q);
  if (city) filter.city = searchRegex(city);
  const query = Firm.find(filter).sort({ _id: -1 }).select('name slug logo city size followers verified');
  res.json(await paginate(query, req.query, (firm) => withCount(firm, 'followers', req.user._id, 'following')));
}

export async function get(req, res) {
  const firm = found(await Firm.findOne({ slug: req.params.slug }).populate('team', CARD).lean(), 'Firm');
  const jobs = await Job.find({ firm: firm._id, ...openRoles() }).sort({ _id: -1 }).select('-description').lean();
  const canHire = same(firm.owner, req.user._id) || has(firm.admins, req.user._id) || req.user.isAdmin;
  res.json({
    ...withCount(firm, 'followers', req.user._id, 'following'),
    working: has(firm.team, req.user._id),
    canEdit: same(firm.owner, req.user._id) || req.user.isAdmin,
    canHire,
    ...(canHire && { stats: await statsOf(firm, jobs.length) }),
    jobs,
  });
}

/** What the firm's owner and admins see: followers, open roles and where their applicants stand. */
async function statsOf(firm, openRoles) {
  const jobIds = await Job.find({ firm: firm._id }).distinct('_id');
  const stages = await Application.aggregate([{ $match: { job: { $in: jobIds }, status: { $ne: 'withdrawn' } } }, { $group: { _id: '$status', count: { $sum: 1 } } }]);
  const byStatus = Object.fromEntries(stages.map(({ _id, count }) => [_id, count]));
  return { followers: firm.followers.length, roles: jobIds.length, openRoles, applications: stages.reduce((sum, { count }) => sum + count, 0), byStatus };
}

/** The owner (or a site admin) makes a team member a firm admin, who can then post roles, see applicants and post as the firm. */
export async function setAdmin(req, res) {
  const firm = found(await Firm.findById(req.params.id), 'Firm');
  if (!same(firm.owner, req.user._id) && !req.user.isAdmin) throw new ApiError(403, "Only the firm's owner can choose its admins");
  const { userId } = req.params;
  const adding = req.method === 'PUT';
  if (adding && !has(firm.team, userId)) throw new ApiError(400, 'Only people on the team list can be admins');
  if (adding) firm.admins.addToSet(userId);
  else firm.admins.pull(userId);
  await firm.save();
  if (adding) await notify({ user: userId, actor: req.user._id, type: 'firm_admin', text: firm.name, link: `/firms/${firm.slug}` });
  res.json({ admins: firm.admins });
}

export async function create(req, res) {
  const firm = new Firm({ ...req.body, slug: await uniqueSlug(Firm, req.body.name), owner: req.user._id, team: [req.user._id] });
  await applyFiles(firm, req.files);
  await firm.save();
  res.status(201).json(firm);
}

export async function update(req, res) {
  const firm = found(await Firm.findById(req.params.id), 'Firm');
  await assertCanManage(req.user, firm.owner);
  const { removeGallery = [], ...fields } = req.body;
  const removed = firm.gallery.filter((url) => removeGallery.includes(url));
  firm.set(fields);
  firm.gallery = firm.gallery.filter((url) => !removed.includes(url));
  const replaced = await applyFiles(firm, req.files);
  await firm.save();
  await removeFiles([...replaced, ...removed]);
  res.json(firm);
}

export async function follow(req, res) {
  const { active, count } = await toggle(Firm, req.params.id, 'followers', req.user._id);
  res.json({ following: active, followersCount: count });
}

/** "I work here" toggle: adds or removes the viewer from the firm's team list. */
export async function work(req, res) {
  const { doc, active } = await toggle(Firm, req.params.id, 'team', req.user._id);
  // Leaving the team also ends any admin role there.
  if (!active) await Firm.updateOne({ _id: doc._id }, { $pull: { admins: req.user._id } });
  await doc.populate('team', CARD);
  res.json({ working: active, team: doc.team });
}
