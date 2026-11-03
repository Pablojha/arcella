import Application from '../models/Application.js';
import AuditLog from '../models/AuditLog.js';
import College from '../models/College.js';
import Connection from '../models/Connection.js';
import Device from '../models/Device.js';
import Event from '../models/Event.js';
import Firm from '../models/Firm.js';
import Job from '../models/Job.js';
import LoginEvent from '../models/LoginEvent.js';
import Post from '../models/Post.js';
import Project from '../models/Project.js';
import Question from '../models/Question.js';
import Report from '../models/Report.js';
import Resource from '../models/Resource.js';
import User from '../models/User.js';
import Verification from '../models/Verification.js';
import { CARD, COLLEGE_ADMINS } from '../config/constants.js';
import { env } from '../config/env.js';
import { hasPermission, rankOf } from '../config/permissions.js';
import { deleteAccount } from '../services/account.js';
import { audit } from '../services/audit.js';
import { previewContent, removeContent } from '../services/content.js';
import { grantMembership, revokeMemberships } from '../services/membership.js';
import { notify } from '../services/notify.js';
import { disconnectDevices } from '../services/realtime.js';
import { signOutDevices } from '../services/security.js';
import { membersOf } from '../utils/access.js';
import { ApiError, found } from '../utils/errors.js';
import { paginate } from '../utils/query.js';
import { same } from '../utils/shape.js';
import { searchRegex } from '../utils/text.js';

const DAY = 24 * 60 * 60 * 1000;
const since = (days) => new Date(Date.now() - days * DAY);

const COUNTS = {
  users: [User],
  verified: [User, { verified: true }],
  pending: [Verification, { method: 'document', status: 'pending' }],
  reports: [Report, { status: 'open' }],
  suspended: [User, { status: { $in: ['suspended', 'banned'] } }],
  colleges: [College],
  posts: [Post],
  projects: [Project],
  jobs: [Job],
  applications: [Application],
  firms: [Firm],
  connections: [Connection, { status: 'accepted' }],
  events: [Event],
  questions: [Question],
  resources: [Resource],
};

/** Live counts, sign-ups and active members, and weekly sign-ups for the last 12 weeks (oldest first). */
export async function stats(req, res) {
  const [entries, joined7, joined30, active7, weeks] = await Promise.all([
    Promise.all(Object.entries(COUNTS).map(async ([key, [Model, filter]]) => [key, await Model.countDocuments(filter)])),
    User.countDocuments({ createdAt: { $gte: since(7) } }),
    User.countDocuments({ createdAt: { $gte: since(30) } }),
    Device.distinct('user', { lastSeenAt: { $gte: since(7) } }).then((ids) => ids.length),
    User.aggregate([{ $match: { createdAt: { $gte: since(84) } } }, { $group: { _id: { $floor: { $divide: [{ $subtract: ['$$NOW', '$createdAt'] }, 7 * DAY] } }, count: { $sum: 1 } } }]),
  ]);
  const growth = Array.from({ length: 12 }, (_, index) => weeks.find((week) => week._id === 11 - index)?.count ?? 0);
  res.json({ ...Object.fromEntries(entries), joined7, joined30, active7, growth });
}

export async function users(req, res) {
  const { q, college, role, status } = req.query;
  const filter = college ? membersOf(college) : {};
  if (role) filter.role = role === 'user' ? { $in: ['user', null] } : role;
  if (status) filter.status = status === 'active' ? { $in: ['active', null] } : status;
  if (q) filter.$or = ['name', 'email', 'username'].map((field) => ({ [field]: searchRegex(q) }));
  const query = User.find(filter).select(`${CARD} email college collegeRole batch isAdmin role status suspendedUntil statusReason createdAt`).populate('college', 'name short').sort({ _id: -1 });
  res.json(await paginate(query, req.query));
}

/** One member for staff: account state, what they've posted, reports about them, recent sign-ins and staff actions. */
export async function user(req, res) {
  const member = found(await User.findById(req.params.id).select(`${CARD} email emailVerified role status suspendedUntil statusReason createdAt lastActiveAt connectionsCount`).lean(), 'User');
  const [posts, reports, signIns, actions] = await Promise.all([
    Post.countDocuments({ author: member._id }),
    Report.find({ type: 'user', target: member._id }).sort({ _id: -1 }).limit(10).populate('reporter', CARD).lean(),
    LoginEvent.find({ user: member._id }).sort({ _id: -1 }).limit(10).select('ok reason agent createdAt').lean(),
    AuditLog.find({ target: member._id }).sort({ _id: -1 }).limit(20).populate('actor', CARD).lean(),
  ]);
  res.json({ user: member, posts, reports, signIns, actions });
}

/** Staff can't act on themselves or on staff of their own rank or above. */
async function assertOutranks(actor, targetId) {
  if (same(actor._id, targetId)) throw new ApiError(400, "You can't change your own account here");
  const target = found(await User.findById(targetId), 'User');
  if (rankOf(target.role) >= rankOf(actor.role)) throw new ApiError(403, 'You can only act on accounts below your own role');
  return target;
}

/** Super admins give or take staff roles. Addresses in ADMIN_EMAIL stay super admins (the list wins at their next sign-in). */
export async function setRole(req, res) {
  const target = await assertOutranks(req.user, req.params.id);
  if (env.adminEmails.includes(target.email)) throw new ApiError(400, 'This address is in ADMIN_EMAIL, so it is always a super admin');
  const previous = target.role;
  target.role = req.body.role;
  await target.save();
  await audit(req, 'user.role', { type: 'user', id: target._id }, { from: previous, to: target.role });
  res.json({ _id: target._id, role: target.role, isAdmin: target.isAdmin });
}

/**
 * Suspends (moderators, for 1–365 days), bans (admins) or restores an account. Suspending or banning signs it out
 * everywhere at once; the reason is shown to the member when they try to sign in.
 */
export async function setStatus(req, res) {
  const { status, days, reason } = req.body;
  const banning = status === 'banned' || (status === 'active' && (await User.exists({ _id: req.params.id, status: 'banned' })));
  if (banning && !hasPermission(req.user, 'users:ban')) throw new ApiError(403, 'Only admins can ban or unban accounts');
  if (status === 'suspended' && !days) throw new ApiError(400, 'Choose how many days the suspension lasts');
  const target = await assertOutranks(req.user, req.params.id);
  target.status = status;
  target.statusReason = status === 'active' ? undefined : reason;
  target.suspendedUntil = status === 'suspended' ? new Date(Date.now() + days * DAY) : undefined;
  if (status !== 'active') {
    disconnectDevices(await Device.find({ user: target._id }).distinct('_id'), target._id);
    await signOutDevices(target);
  }
  await target.save();
  await audit(req, `user.${status === 'active' ? 'restore' : status === 'banned' ? 'ban' : 'suspend'}`, { type: 'user', id: target._id }, { reason, until: target.suspendedUntil });
  res.json({ _id: target._id, status: target.status, suspendedUntil: target.suspendedUntil, statusReason: target.statusReason });
}

export async function verifyUser(req, res) {
  const member = found(await User.findById(req.params.id), 'User');
  found(await College.exists({ _id: req.body.college }), 'College');
  await Verification.create({ ...req.body, user: member._id, method: 'manual', status: 'approved', reviewer: req.user._id, reviewedAt: new Date() });
  await grantMembership(member._id, req.body, req.user._id);
  await audit(req, 'user.verify', { type: 'user', id: member._id }, { college: req.body.college, role: req.body.role });
  res.json({ ok: true });
}

/** Withdraws all of a member's college verifications (and group roles); their education stays, unverified. */
export async function revokeUser(req, res) {
  await revokeMemberships(req.params.id);
  await audit(req, 'user.unverify', { type: 'user', id: req.params.id });
  res.json({ ok: true });
}

export async function colleges(req, res) {
  const { q } = req.query;
  const filter = q ? { $or: ['name', 'short', 'city'].map((field) => ({ [field]: searchRegex(q) })) } : {};
  res.json(await paginate(College.find(filter).sort({ name: 1 }).populate(COLLEGE_ADMINS), req.query));
}

export async function updateCollege(req, res) {
  const college = found(await College.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate(COLLEGE_ADMINS), 'College');
  await audit(req, 'college.update', { type: 'college', id: college._id }, req.body);
  res.json(college);
}

/** Open reports, newest first, each with a preview of what was reported. */
export async function reports(req, res) {
  const page = await paginate(Report.find({ status: 'open' }).sort({ _id: -1 }).populate('reporter', CARD), req.query);
  const items = await Promise.all(page.items.map(async (report) => ({ ...report, content: await previewContent(report.type, report.target) })));
  res.json({ ...page, items });
}

/** Removes the reported content or dismisses it; every open report about it is closed. Removing an account needs `users:ban`. */
export async function resolveReport(req, res) {
  const report = found(await Report.findOne({ _id: req.params.id, status: 'open' }), 'Open report');
  const remove = req.body.action === 'remove';
  if (remove && report.type === 'user') {
    if (!hasPermission(req.user, 'users:ban')) throw new ApiError(403, 'Only admins can remove accounts. Suspend it from Users instead.');
    if (await User.exists({ _id: report.target, role: { $nin: ['user', null] } })) throw new ApiError(400, 'Staff accounts cannot be removed from a report');
    await deleteAccount(report.target);
  } else if (remove) await removeContent(report.type, report.target);
  await Report.updateMany({ type: report.type, target: report.target, status: 'open' }, { status: remove ? 'removed' : 'dismissed', resolvedBy: req.user._id });
  await audit(req, `report.${remove ? 'remove' : 'dismiss'}`, { type: report.type, id: report.target }, { reason: report.reason });
  res.json({ ok: true });
}

/** Every job, open or not, for moderation. */
export async function jobs(req, res) {
  const { q, closed } = req.query;
  const filter = {};
  if (closed !== undefined) filter.closed = closed ? true : { $ne: true };
  if (q) filter.$or = ['title', 'company'].map((field) => ({ [field]: searchRegex(q) }));
  res.json(await paginate(Job.find(filter).sort({ _id: -1 }).select('title company type closed applicationsCount createdAt postedBy firm').populate('postedBy', CARD), req.query));
}

/** Takes down a fraudulent or rule-breaking role, with its applications, and tells the poster why. */
export async function removeJob(req, res) {
  const job = found(await Job.findById(req.params.id).lean(), 'Job');
  await removeContent('job', job._id);
  await notify({ user: job.postedBy, actor: req.user._id, type: 'job_removed', text: `${job.title}: ${req.body.reason}`, link: '/jobs?tab=hiring' });
  await audit(req, 'job.remove', { type: 'job', id: job._id }, { title: job.title, reason: req.body.reason });
  res.json({ ok: true });
}

export async function firms(req, res) {
  const { q, verified } = req.query;
  const filter = {};
  if (verified !== undefined) filter.verified = verified ? true : { $ne: true };
  if (q) filter.name = searchRegex(q);
  res.json(await paginate(Firm.find(filter).sort({ _id: -1 }).select('name slug logo city verified owner createdAt').populate('owner', CARD), req.query));
}

/** Gives or removes a firm's verified badge. */
export async function verifyFirm(req, res) {
  const firm = found(await Firm.findByIdAndUpdate(req.params.id, { verified: req.body.verified }, { new: true }).select('name verified owner'), 'Firm');
  await audit(req, `firm.${firm.verified ? 'verify' : 'unverify'}`, { type: 'firm', id: firm._id }, { name: firm.name });
  res.json({ _id: firm._id, verified: firm.verified });
}

export async function removeFirm(req, res) {
  const firm = found(await Firm.findById(req.params.id).lean(), 'Firm');
  await removeContent('firm', firm._id);
  await notify({ user: firm.owner, actor: req.user._id, type: 'firm_removed', text: `${firm.name}: ${req.body.reason}`, link: '/firms' });
  await audit(req, 'firm.remove', { type: 'firm', id: firm._id }, { name: firm.name, reason: req.body.reason });
  res.json({ ok: true });
}

export async function auditLog(req, res) {
  const { action, actor, target } = req.query;
  const filter = {};
  if (action) filter.action = new RegExp(`^${action.replace(/[^a-z_.]/g, '')}`);
  if (actor) filter.actor = actor;
  if (target) filter.target = target;
  res.json(await paginate(AuditLog.find(filter).sort({ _id: -1 }).populate('actor', CARD), req.query));
}
