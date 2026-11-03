import path from 'node:path';
import College from '../models/College.js';
import User from '../models/User.js';
import Verification from '../models/Verification.js';
import { CARD } from '../config/constants.js';
import { grantMembership, sameMembership } from '../services/membership.js';
import { notify, notifyMany } from '../services/notify.js';
import { checkCode, resendCode } from '../services/otp.js';
import { profileOf } from '../services/profile.js';
import { assertModerator, runBy } from '../utils/access.js';
import { ApiError, found } from '../utils/errors.js';

const DOC_MIME = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };

/** Members can verify several colleges, but each college and degree level only once. */
function assertNotVerified(user, details) {
  if (user.memberships.some((entry) => entry.verified && sameMembership(entry, details))) throw new ApiError(400, "You're already verified for this college and degree");
}

/** The member's latest request (`verification`) and the ones still waiting (`items`). */
export async function mine(req, res) {
  const requests = await Verification.find({ user: req.user._id }).sort({ _id: -1 }).populate('college', 'name short domains').lean();
  res.json({ verification: requests[0] ?? null, items: requests.filter((request) => request.status === 'pending') });
}

export async function sendCode(req, res) {
  const { college: collegeId, email, ...details } = req.body;
  assertNotVerified(req.user, req.body);
  const college = found(await College.findById(collegeId), 'College');
  if (!college.domains.length) throw new ApiError(400, 'This college has no official email domain yet. Please upload a document instead.');
  if (!college.allowsEmail(email)) throw new ApiError(400, `Use your official college email (${college.domains.map((d) => `@${d}`).join(' or ')})`);
  if (await Verification.exists({ email, status: 'approved', user: { $ne: req.user._id } })) {
    throw new ApiError(409, 'This college email is already linked to another account');
  }
  // One code at a time: a new request replaces any earlier one by email.
  await Verification.deleteMany({ user: req.user._id, method: 'email', status: 'pending' });
  await Verification.create({ ...details, college: college._id, email, user: req.user._id, method: 'email' });
  res.json({ email, ...(await resendCode(email, 'college', college.name)) });
}

export async function confirmCode(req, res) {
  const request = found(await Verification.findOne({ user: req.user._id, method: 'email', status: 'pending' }), 'Verification request');
  assertNotVerified(req.user, request);
  await checkCode(request.email, 'college', req.body.code);
  await Verification.updateOne({ _id: request._id }, { status: 'approved', reviewedAt: new Date() });
  await grantMembership(req.user._id, request);
  res.json({ user: await profileOf(await User.findById(req.user._id)) });
}

export async function uploadDocument(req, res) {
  assertNotVerified(req.user, req.body);
  if (!req.file) throw new ApiError(400, 'Attach a photo or PDF of your document');
  const college = found(await College.findById(req.body.college).select('name admin coAdmin'), 'College');
  await Verification.deleteMany({ user: req.user._id, college: college._id, status: 'pending' });
  const request = await Verification.create({
    ...req.body,
    user: req.user._id,
    method: 'document',
    docData: req.file.buffer,
    docMime: DOC_MIME[path.extname(req.file.originalname).slice(1).toLowerCase()],
  });
  await notifyMany({ users: [college.admin, college.coAdmin].filter(Boolean), actor: req.user._id, type: 'verify_request', text: college.name, link: '/college?tab=review' });
  res.status(201).json({ verification: { _id: request._id, status: request.status, method: request.method, college: { _id: college._id, name: college.name } } });
}

/** Pending document requests for every college the reviewer runs as admin or co-admin (all colleges for site admins). */
export async function queue(req, res) {
  const filter = { method: 'document', status: 'pending' };
  if (!req.user.isAdmin) filter.college = { $in: await College.find(runBy(req.user._id)).distinct('_id') };
  const items = await Verification.find(filter).sort({ _id: 1 }).populate('user', CARD).populate('college', 'name short').lean();
  res.json({ items });
}

export async function document(req, res) {
  const request = found(await Verification.findById(req.params.id).select('+docData'), 'Request');
  await assertModerator(req.user, request.college);
  if (!request.docData) throw new ApiError(410, 'This document was deleted after review');
  res.set({ 'Cache-Control': 'no-store', 'Content-Disposition': 'inline' }).type(request.docMime).send(request.docData);
}

/** Approves or rejects a document request; the document itself is deleted either way. */
export async function review(req, res) {
  const { decision, note } = req.body;
  const request = found(await Verification.findOne({ _id: req.params.id, method: 'document', status: 'pending' }), 'Pending request');
  await assertModerator(req.user, request.college);
  const approved = decision === 'approve';
  await Verification.updateOne(
    { _id: request._id },
    { $set: { status: approved ? 'approved' : 'rejected', reviewer: req.user._id, note, reviewedAt: new Date() }, $unset: { docData: 1, docMime: 1 } },
  );
  if (approved) await grantMembership(request.user, request, req.user._id);
  else await notify({ user: request.user, actor: req.user._id, type: 'verify_rejected', text: note, link: '/college' });
  res.json({ ok: true });
}
