import crypto from 'node:crypto';
import path from 'node:path';
import College from '../models/College.js';
import User from '../models/User.js';
import Verification from '../models/Verification.js';
import { CARD } from '../config/constants.js';
import { env } from '../config/env.js';
import { otpEmail, sendMail } from '../services/mail.js';
import { grantMembership } from '../services/membership.js';
import { notify } from '../services/notify.js';
import { profileOf } from '../services/profile.js';
import { assertModerator } from '../utils/access.js';
import { ApiError, found } from '../utils/errors.js';

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const DOC_MIME = { pdf: 'application/pdf', jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };

const hashCode = (code) => crypto.createHash('sha256').update(code).digest('hex');

function assertNotVerified(user) {
  if (user.verified) throw new ApiError(400, 'You are already a verified member of your college');
}

export async function mine(req, res) {
  const verification = await Verification.findOne({ user: req.user._id }).sort({ _id: -1 }).populate('college', 'name short domains').lean();
  res.json({ verification });
}

export async function sendCode(req, res) {
  assertNotVerified(req.user);
  const { college: collegeId, role, batch, email } = req.body;
  const college = found(await College.findById(collegeId), 'College');
  if (!college.domains.length) throw new ApiError(400, 'This college has no official email domain yet. Please upload a document instead.');
  if (!college.allowsEmail(email)) throw new ApiError(400, `Use your official college email (${college.domains.map((d) => `@${d}`).join(' or ')})`);
  if (await Verification.exists({ email, status: 'approved', user: { $ne: req.user._id } })) {
    throw new ApiError(409, 'This college email is already linked to another account');
  }
  const code = String(crypto.randomInt(100000, 1000000));
  await Verification.findOneAndUpdate(
    { user: req.user._id, method: 'email', status: 'pending' },
    { college: college._id, role, batch, email, codeHash: hashCode(code), expiresAt: new Date(Date.now() + CODE_TTL_MS), attempts: 0 },
    { upsert: true },
  );
  const sent = await sendMail({ to: email, subject: `${code} is your Arcella verification code`, html: otpEmail(code, college.name) });
  if (!sent && env.isProd) throw new ApiError(503, 'Email delivery is not set up yet. Please upload a document instead.');
  if (!sent) console.log(`[dev] Verification code for ${email}: ${code}`);
  res.json({ email, ...(sent ? {} : { devCode: code }) });
}

export async function confirmCode(req, res) {
  assertNotVerified(req.user);
  const request = await Verification.findOne({ user: req.user._id, method: 'email', status: 'pending' }).select('+codeHash');
  found(request, 'Verification request');
  if (request.expiresAt < new Date()) throw new ApiError(400, 'This code has expired. Please request a new one.');
  if (request.attempts >= MAX_ATTEMPTS) throw new ApiError(429, 'Too many wrong attempts. Please request a new code.');
  if (request.codeHash !== hashCode(req.body.code)) {
    request.attempts += 1;
    await request.save();
    const left = MAX_ATTEMPTS - request.attempts;
    throw new ApiError(400, left ? `That code is not right. ${left} attempt${left === 1 ? '' : 's'} left.` : 'Too many wrong attempts. Please request a new code.');
  }
  await Verification.updateOne({ _id: request._id }, { $set: { status: 'approved', reviewedAt: new Date() }, $unset: { codeHash: 1 } });
  await grantMembership(req.user._id, request);
  res.json({ user: await profileOf(await User.findById(req.user._id)) });
}

export async function uploadDocument(req, res) {
  assertNotVerified(req.user);
  if (!req.file) throw new ApiError(400, 'Attach a photo or PDF of your document');
  const college = found(await College.findById(req.body.college).select('name moderators'), 'College');
  await Verification.deleteMany({ user: req.user._id, status: 'pending' });
  const request = await Verification.create({
    ...req.body,
    user: req.user._id,
    method: 'document',
    docData: req.file.buffer,
    docMime: DOC_MIME[path.extname(req.file.originalname).slice(1).toLowerCase()],
  });
  await Promise.all(
    college.moderators.map((moderator) =>
      notify({ user: moderator, actor: req.user._id, type: 'verify_request', text: college.name, link: '/college?tab=review' }),
    ),
  );
  res.status(201).json({ verification: { _id: request._id, status: request.status, method: request.method, college: { _id: college._id, name: college.name } } });
}

/** Pending document requests for every college the reviewer moderates (all colleges for admins). */
export async function queue(req, res) {
  const filter = { method: 'document', status: 'pending' };
  if (!req.user.isAdmin) filter.college = { $in: await College.find({ moderators: req.user._id }).distinct('_id') };
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
