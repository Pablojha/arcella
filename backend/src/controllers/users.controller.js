import { isObjectIdOrHexString } from 'mongoose';
import Connection from '../models/Connection.js';
import Follow from '../models/Follow.js';
import ProfileView from '../models/ProfileView.js';
import Resume from '../models/Resume.js';
import User from '../models/User.js';
import { CARD } from '../config/constants.js';
import { deleteAccount, exportAccount } from '../services/account.js';
import { hiddenIds, isBlockedBetween } from '../services/blocks.js';
import { notify } from '../services/notify.js';
import * as membership from '../services/membership.js';
import { profileOf } from '../services/profile.js';
import { removeFiles, saveFile } from '../services/storage.js';
import { memberCollegeIds, membersOf } from '../utils/access.js';
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
  if (college) Object.assign(filter, membersOf(college));
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
    { $addFields: { sameCollege: { $gt: [{ $size: { $setIntersection: [{ $ifNull: ['$memberships.college', []] }, memberCollegeIds(me)] } }, 0] } } },
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
  const user = await User.findOne({ ...filter, blocked: { $ne: req.user._id } })
    .select('-passwordChangedAt -signedOutAt -twoFactor -status -suspendedUntil -statusReason')
    .populate('college', 'name short city')
    .populate('memberships.college', 'name short city')
    .lean();
  found(user, 'Profile');
  const [status, followersCount, following] = await Promise.all([
    Connection.statusOf(req.user._id, user._id),
    Follow.countDocuments({ following: user._id }),
    Follow.exists({ follower: req.user._id, following: user._id }),
  ]);
  const self = same(user._id, req.user._id);
  const shows = (visibility) => self || visibility === 'everyone' || (visibility === 'connections' && status === 'connected');
  const { email, contact = {}, notificationsOff, ...visible } = user;
  const contactInfo = { email: shows(contact.emailVisibility) ? email : undefined, phone: shows(contact.phoneVisibility) ? contact.phone : undefined };
  if (!self) await ProfileView.updateOne({ viewer: req.user._id, viewed: user._id, day: new Date().toISOString().slice(0, 10) }, { $setOnInsert: { at: new Date() } }, { upsert: true });
  res.json({ user: { ...visible, followersCount }, contactInfo, status, following: Boolean(following), blocked: has(req.user.blocked, user._id) });
}

/** Follows or unfollows a member. Blocks either way rule it out; the person followed is told. */
export async function toggleFollow(req, res) {
  const { id } = req.params;
  if (same(id, req.user._id)) throw new ApiError(400, "You can't follow yourself");
  found(await User.exists({ _id: id }), 'User');
  const removed = await Follow.findOneAndDelete({ follower: req.user._id, following: id });
  if (!removed) {
    if (await isBlockedBetween(req.user._id, id)) throw new ApiError(403, "You can't follow this member");
    await Follow.create({ follower: req.user._id, following: id });
    await notify({ user: id, actor: req.user._id, type: 'follow', link: `/u/${req.user.username}` });
  }
  res.json({ following: !removed, followersCount: await Follow.countDocuments({ following: id }) });
}

export async function setNotifications(req, res) {
  req.user.notificationsOff = req.body.off;
  await req.user.save();
  res.json({ user: await profileOf(req.user) });
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
  if (blocking) await Follow.deleteMany({ $or: [{ follower: req.user._id, following: id }, { follower: id, following: req.user._id }] });
  await User.updateOne({ _id: req.user._id }, blocking ? { $addToSet: { blocked: id } } : { $pull: { blocked: id } });
  if (blocking) await Connection.sever(req.user._id, id);
  res.json({ blocked: blocking });
}

export async function blockedList(req, res) {
  res.json({ items: await User.find({ _id: { $in: req.user.blocked } }).select(CARD).lean() });
}

/** Adds a college to the member's education; `membership` is the new entry's id, for verifying it next. */
export async function addMembership(req, res) {
  const entry = await membership.addMembership(req.user, req.body);
  res.status(201).json({ user: await profileOf(req.user), membership: entry._id });
}

export async function updateMembership(req, res) {
  await membership.updateMembership(req.user, req.params.membershipId, req.body);
  res.json({ user: await profileOf(req.user) });
}

export async function removeMembership(req, res) {
  await membership.removeMembership(req.user, req.params.membershipId);
  res.json({ user: await profileOf(req.user) });
}

export async function choosePrimary(req, res) {
  await membership.choosePrimary(req.user, req.params.membershipId);
  res.json({ user: await profileOf(req.user) });
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

/** Who viewed the member's profile in the last 30 days: the count and the latest viewers (hidden people left out). */
export async function profileViews(req, res) {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const filter = { viewed: req.user._id, at: { $gte: since }, viewer: { $nin: await hiddenIds(req.user) } };
  const [count, recent] = await Promise.all([
    ProfileView.countDocuments(filter),
    ProfileView.find(filter).sort({ at: -1 }).limit(20).populate('viewer', CARD).lean(),
  ]);
  res.json({ count, viewers: recent.filter((view) => view.viewer).map((view) => ({ ...view.viewer, viewedAt: view.at })) });
}

const RESUME_MIME = { pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };

export async function myResume(req, res) {
  res.json({ resume: await Resume.findOne({ user: req.user._id }).select('name size updatedAt').lean() });
}

export async function saveResume(req, res) {
  if (!req.file) throw new ApiError(400, 'Choose a PDF or Word file');
  const name = req.file.originalname.split(/[\\/]/).pop();
  const fields = { name, mime: RESUME_MIME[name.split('.').pop().toLowerCase()], size: req.file.size, data: req.file.buffer };
  await Resume.updateOne({ user: req.user._id }, { $set: fields }, { upsert: true });
  res.json({ resume: await Resume.findOne({ user: req.user._id }).select('name size updatedAt').lean() });
}

export async function downloadResume(req, res) {
  const resume = found(await Resume.findOne({ user: req.user._id }).select('+data'), 'Resume');
  res.set({ 'Cache-Control': 'no-store', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(resume.name)}`, 'X-Content-Type-Options': 'nosniff' }).type(resume.mime || 'application/octet-stream').send(resume.data);
}

export async function removeResume(req, res) {
  await Resume.deleteOne({ user: req.user._id });
  res.json({ ok: true });
}
