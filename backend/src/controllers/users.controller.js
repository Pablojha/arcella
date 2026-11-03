import { isObjectIdOrHexString } from 'mongoose';
import Connection from '../models/Connection.js';
import User from '../models/User.js';
import { CARD } from '../config/constants.js';
import { deleteAccount, exportAccount } from '../services/account.js';
import { hiddenIds } from '../services/blocks.js';
import { profileOf } from '../services/profile.js';
import { removeFiles, saveFile } from '../services/storage.js';
import { ApiError, found } from '../utils/errors.js';
import { paginate } from '../utils/query.js';
import { has, same } from '../utils/shape.js';
import { escapeRegex, searchRegex } from '../utils/text.js';

const CARD_FIELDS = Object.fromEntries(CARD.split(' ').map((field) => [field, 1]));

export async function search(req, res) {
  const { q, software, college, type } = req.query;
  const filter = { _id: { $nin: [req.user._id, ...(await hiddenIds(req.user))] } };
  if (q) {
    const rx = searchRegex(q);
    filter.$or = [{ name: rx }, { headline: rx }, { skills: rx }, { software: rx }];
  }
  if (software) filter.software = new RegExp(`^${escapeRegex(software)}$`, 'i');
  if (college) filter.college = college;
  if (type) filter.type = type;
  const query = User.find(filter).select(`${CARD} college`).populate('college', 'name short').sort({ verified: -1, connectionsCount: -1, _id: -1 });
  const page = await paginate(query, req.query);
  res.json({ ...page, items: await Connection.withStatus(req.user._id, page.items) });
}

export async function suggestions(req, res) {
  const me = req.user;
  const linked = await Connection.find({ $or: [{ from: me._id }, { to: me._id }] }).select('from to').lean();
  const exclude = [me._id, ...(await hiddenIds(me)), ...linked.map((row) => (same(row.from, me._id) ? row.to : row.from))];
  const items = await User.aggregate([
    { $match: { _id: { $nin: exclude } } },
    { $addFields: { sameCollege: me.college ? { $eq: ['$college', me.college] } : false } },
    { $sort: { sameCollege: -1, verified: -1, connectionsCount: -1, _id: -1 } },
    { $limit: 12 },
    { $project: CARD_FIELDS },
  ]);
  res.json({ items: items.map((user) => ({ ...user, status: 'none' })) });
}

/** A member's public profile. People who blocked the viewer are not found. */
export async function profile(req, res) {
  const { id } = req.params;
  const filter = isObjectIdOrHexString(id) ? { _id: id } : { username: id.toLowerCase() };
  const user = await User.findOne({ ...filter, blocked: { $ne: req.user._id } }).select('-email -passwordChangedAt').populate('college', 'name short city').lean();
  found(user, 'Profile');
  res.json({ user, status: await Connection.statusOf(req.user._id, user._id), blocked: has(req.user.blocked, user._id) });
}

export async function updateMe(req, res) {
  req.user.set(req.body);
  await req.user.save();
  res.json({ user: await profileOf(req.user) });
}

export const updateImage = (field) => async (req, res) => {
  if (!req.file) throw new ApiError(400, 'Choose an image to upload');
  const previous = req.user[field];
  req.user[field] = await saveFile(req.file, `${field}s`);
  await req.user.save();
  await removeFiles([previous]);
  res.json({ user: await profileOf(req.user) });
};

/** Blocks or unblocks a member. Blocking also removes any connection or pending request. */
export async function toggleBlock(req, res) {
  const { id } = req.params;
  if (same(id, req.user._id)) throw new ApiError(400, "You can't block yourself");
  found(await User.exists({ _id: id }), 'User');
  const blocking = !has(req.user.blocked, id);
  await User.updateOne({ _id: req.user._id }, blocking ? { $addToSet: { blocked: id } } : { $pull: { blocked: id } });
  if (blocking) await Connection.sever(req.user._id, id);
  res.json({ blocked: blocking });
}

export async function blockedList(req, res) {
  res.json({ items: await User.find({ _id: { $in: req.user.blocked } }).select(CARD).lean() });
}

/** "Download your data": the member's data as a JSON file. */
export async function exportMe(req, res) {
  const date = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Disposition', `attachment; filename="arcella-data-${req.user.username}-${date}.json"`);
  res.json(await exportAccount(req.user._id));
}

export async function deleteMe(req, res) {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.checkPassword(req.body.password))) throw new ApiError(400, 'That password is not right');
  await deleteAccount(user._id);
  res.json({ ok: true });
}
