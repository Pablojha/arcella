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
import { CARD } from '../config/constants.js';
import { deleteAccount } from '../services/account.js';
import { previewContent, removeContent } from '../services/content.js';
import { grantMembership } from '../services/membership.js';
import { ApiError, found } from '../utils/errors.js';
import { paginate } from '../utils/query.js';
import { has, same } from '../utils/shape.js';
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
  const filter = college ? { college } : {};
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

export async function revokeUser(req, res) {
  found(await User.findByIdAndUpdate(req.params.id, { verified: false, $unset: { college: 1, collegeRole: 1, batch: 1 } }), 'User');
  await College.updateMany({ moderators: req.params.id }, { $pull: { moderators: req.params.id } });
  res.json({ ok: true });
}

export async function colleges(req, res) {
  const { q } = req.query;
  const filter = q ? { $or: ['name', 'short', 'city'].map((field) => ({ [field]: searchRegex(q) })) } : {};
  res.json(await paginate(College.find(filter).sort({ name: 1 }).populate('moderators', CARD), req.query));
}

export async function updateCollege(req, res) {
  const college = await College.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true }).populate('moderators', CARD);
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

/** Promotes a verified member to moderator, or demotes an existing moderator. */
export async function toggleModerator(req, res) {
  const college = found(await College.findById(req.params.id), 'College');
  const { userId } = req.params;
  const isModerator = has(college.moderators, userId);
  if (!isModerator) {
    const user = found(await User.findById(userId).select('verified college'), 'User');
    if (!user.verified || !same(user.college, college._id)) throw new ApiError(400, 'Moderators must be verified members of this college');
  }
  college.moderators = isModerator ? college.moderators.filter((id) => !same(id, userId)) : [...college.moderators, userId];
  await college.save();
  await college.populate('moderators', CARD);
  res.json(college);
}
