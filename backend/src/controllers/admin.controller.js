import College from '../models/College.js';
import Event from '../models/Event.js';
import Job from '../models/Job.js';
import Post from '../models/Post.js';
import Project from '../models/Project.js';
import Question from '../models/Question.js';
import Report from '../models/Report.js';
import Resource from '../models/Resource.js';
import User from '../models/User.js';
import Verification from '../models/Verification.js';
import { CARD, COLLEGE_ADMINS } from '../config/constants.js';
import { deleteAccount } from '../services/account.js';
import { previewContent, removeContent } from '../services/content.js';
import { grantMembership, revokeMemberships } from '../services/membership.js';
import { membersOf } from '../utils/access.js';
import { ApiError, found } from '../utils/errors.js';
import { paginate } from '../utils/query.js';
import { searchRegex } from '../utils/text.js';

const COUNTS = {
  users: [User],
  verified: [User, { verified: true }],
  pending: [Verification, { method: 'document', status: 'pending' }],
  reports: [Report, { status: 'open' }],
  colleges: [College],
  posts: [Post],
  projects: [Project],
  jobs: [Job],
  events: [Event],
  questions: [Question],
  resources: [Resource],
};

export async function stats(req, res) {
  const entries = await Promise.all(Object.entries(COUNTS).map(async ([key, [Model, filter]]) => [key, await Model.countDocuments(filter)]));
  res.json(Object.fromEntries(entries));
}

export async function users(req, res) {
  const { q, college } = req.query;
  const filter = college ? membersOf(college) : {};
  if (q) filter.$or = ['name', 'email', 'username'].map((field) => ({ [field]: searchRegex(q) }));
  const query = User.find(filter).select(`${CARD} email college collegeRole batch isAdmin createdAt`).populate('college', 'name short').sort({ _id: -1 });
  res.json(await paginate(query, req.query));
}

export async function verifyUser(req, res) {
  const user = found(await User.findById(req.params.id), 'User');
  found(await College.exists({ _id: req.body.college }), 'College');
  await Verification.create({ ...req.body, user: user._id, method: 'manual', status: 'approved', reviewer: req.user._id, reviewedAt: new Date() });
  await grantMembership(user._id, req.body, req.user._id);
  res.json({ ok: true });
}

/** Withdraws all of a member's college verifications (and group roles); their education stays, unverified. */
export async function revokeUser(req, res) {
  await revokeMemberships(req.params.id);
  res.json({ ok: true });
}

export async function colleges(req, res) {
  const { q } = req.query;
  const filter = q ? { $or: ['name', 'short', 'city'].map((field) => ({ [field]: searchRegex(q) })) } : {};
  res.json(await paginate(College.find(filter).sort({ name: 1 }).populate(COLLEGE_ADMINS), req.query));
}

export async function updateCollege(req, res) {
  const college = await College.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate(COLLEGE_ADMINS);
  res.json(found(college, 'College'));
}

/** Open reports, newest first, each with a preview of what was reported. */
export async function reports(req, res) {
  const page = await paginate(Report.find({ status: 'open' }).sort({ _id: -1 }).populate('reporter', CARD), req.query);
  const items = await Promise.all(page.items.map(async (report) => ({ ...report, content: await previewContent(report.type, report.target) })));
  res.json({ ...page, items });
}

/** Removes the reported content (or account) or dismisses it; every open report about it is closed. */
export async function resolveReport(req, res) {
  const report = found(await Report.findOne({ _id: req.params.id, status: 'open' }), 'Open report');
  const remove = req.body.action === 'remove';
  if (remove && report.type === 'user') {
    if (await User.exists({ _id: report.target, isAdmin: true })) throw new ApiError(400, 'Admin accounts cannot be removed from a report');
    await deleteAccount(report.target);
  } else if (remove) await removeContent(report.type, report.target);
  await Report.updateMany({ type: report.type, target: report.target, status: 'open' }, { status: remove ? 'removed' : 'dismissed', resolvedBy: req.user._id });
  res.json({ ok: true });
}
