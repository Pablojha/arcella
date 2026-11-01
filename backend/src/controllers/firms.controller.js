import Firm from '../models/Firm.js';
import Job, { openRoles } from '../models/Job.js';
import { CARD } from '../config/constants.js';
import { removeFiles, saveFile, saveFiles } from '../services/storage.js';
import { assertCanManage } from '../utils/access.js';
import { found } from '../utils/errors.js';
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
  if (mine) filter.$or = [{ owner: req.user._id }, { team: req.user._id }];
  if (q) filter.name = searchRegex(q);
  if (city) filter.city = searchRegex(city);
  const query = Firm.find(filter).sort({ _id: -1 }).select('name slug logo city size followers');
  res.json(await paginate(query, req.query, (firm) => withCount(firm, 'followers', req.user._id, 'following')));
}

export async function get(req, res) {
  const firm = found(await Firm.findOne({ slug: req.params.slug }).populate('team', CARD).lean(), 'Firm');
  const jobs = await Job.find({ firm: firm._id, ...openRoles() }).sort({ _id: -1 }).select('-description').lean();
  res.json({
    ...withCount(firm, 'followers', req.user._id, 'following'),
    working: has(firm.team, req.user._id),
    canEdit: same(firm.owner, req.user._id) || req.user.isAdmin,
    jobs,
  });
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
  await doc.populate('team', CARD);
  res.json({ working: active, team: doc.team });
}
