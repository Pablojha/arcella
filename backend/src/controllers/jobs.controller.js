import path from 'node:path';
import Application from '../models/Application.js';
import Firm from '../models/Firm.js';
import Job, { openRoles } from '../models/Job.js';
import { CARD } from '../config/constants.js';
import { removeContent } from '../services/content.js';
import { notify, notifyMany } from '../services/notify.js';
import { ApiError, found } from '../utils/errors.js';
import { paginate } from '../utils/query.js';
import { same } from '../utils/shape.js';
import { searchRegex } from '../utils/text.js';

const RESUME_MIME = { pdf: 'application/pdf', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
const STATUS_TEXT = { shortlisted: 'You were shortlisted', interview: 'Interview scheduled', offered: 'You have an offer', rejected: 'Not moving forward', applied: 'Back under review' };

/** Firms the user may hire for: those they own or the owner made them an admin of. */
const hiringFirms = (userId) => Firm.find({ $or: [{ owner: userId }, { admins: userId }] }).distinct('_id');

/** The poster, the firm's owner and admins, and site admins see a job's applicants and can edit it. */
async function canHire(user, job) {
  if (user.isAdmin || same(job.postedBy, user._id)) return true;
  return Boolean(job.firm && (await Firm.exists({ _id: job.firm?._id ?? job.firm, $or: [{ owner: user._id }, { admins: user._id }] })));
}

async function assertCanHire(user, job) {
  if (!(await canHire(user, job))) throw new ApiError(403, 'Only the people hiring for this role can do this');
}

/** Who hears about a new application: the poster and the firm's owner and admins. */
async function hiringTeam(job) {
  const firm = job.firm && (await Firm.findById(job.firm).select('owner admins').lean());
  return [job.postedBy, firm?.owner, ...(firm?.admins ?? [])].filter(Boolean);
}

async function assertFirmPoster(user, firmId) {
  const firm = found(await Firm.findById(firmId).select('name owner admins'), 'Firm');
  if (!user.isAdmin && !same(firm.owner, user._id) && !firm.admins.some((id) => same(id, user._id))) throw new ApiError(403, "Only the firm's owner and admins can post its roles");
  return firm;
}

export async function list(req, res) {
  const { q, type, location, remote, workplace, experience, firm, saved, hiring } = req.query;
  const filter = hiring ? { $or: [{ postedBy: req.user._id }, { firm: { $in: await hiringFirms(req.user._id) } }] } : saved ? { savedBy: req.user._id } : openRoles();
  if (type) filter.type = type;
  if (firm) filter.firm = firm;
  if (workplace) filter.workplace = workplace;
  else if (remote) filter.workplace = 'remote';
  if (experience) filter.experience = experience;
  if (location) filter.location = searchRegex(location);
  if (q) {
    const rx = searchRegex(q);
    filter.$and = [{ $or: [{ title: rx }, { company: rx }, { skills: rx }] }];
  }
  const query = Job.find(filter).sort({ _id: -1 }).select('-description').populate('firm', 'name slug logo');
  res.json(await paginate(query, req.query));
}

export async function get(req, res) {
  const job = found(await Job.findById(req.params.id).populate('firm', 'name slug logo city').populate('postedBy', CARD).lean(), 'Job');
  const [saved, application, manage] = await Promise.all([
    Job.exists({ _id: job._id, savedBy: req.user._id }),
    Application.findOne({ job: job._id, applicant: req.user._id }).lean(),
    canHire(req.user, job),
  ]);
  res.json({ ...job, saved: Boolean(saved), application, canManage: manage });
}

export async function create(req, res) {
  const body = { ...req.body, postedBy: req.user._id };
  if (body.firm) body.company = (await assertFirmPoster(req.user, body.firm)).name;
  if (!body.company) throw new ApiError(400, 'Company name is required');
  res.status(201).json(await Job.create(body));
}

export async function update(req, res) {
  const job = found(await Job.findById(req.params.id), 'Job');
  await assertCanHire(req.user, job);
  const fields = { ...req.body };
  if (fields.firm && !same(fields.firm, job.firm)) fields.company = (await assertFirmPoster(req.user, fields.firm)).name;
  job.set(fields);
  await job.save();
  res.json(job);
}

export async function remove(req, res) {
  const job = found(await Job.findById(req.params.id), 'Job');
  await assertCanHire(req.user, job);
  await removeContent('job', job._id);
  res.json({ ok: true });
}

export async function save(req, res) {
  const added = await Job.updateOne({ _id: req.params.id, savedBy: { $ne: req.user._id } }, { $addToSet: { savedBy: req.user._id } });
  if (!added.matchedCount) found(await Job.findOneAndUpdate({ _id: req.params.id }, { $pull: { savedBy: req.user._id } }), 'Job');
  res.json({ saved: Boolean(added.matchedCount) });
}

/** Applies in Arcella with a resume (PDF or Word, up to 3 MB) and an optional note. Withdrawn applications can be sent again. */
export async function apply(req, res) {
  const job = found(await Job.findOne({ _id: req.params.id, ...openRoles() }), 'Open role');
  if (job.applyLink) throw new ApiError(400, "This role takes applications on the employer's own site");
  if (same(job.postedBy, req.user._id)) throw new ApiError(400, "You can't apply to a role you posted");
  if (!req.file) throw new ApiError(400, 'Attach your resume (PDF or Word)');
  const previous = await Application.findOne({ job: job._id, applicant: req.user._id });
  if (previous && previous.status !== 'withdrawn') throw new ApiError(409, 'You have already applied to this role');
  if (previous) await previous.deleteOne();
  const resume = { name: path.basename(req.file.originalname), mime: RESUME_MIME[path.extname(req.file.originalname).slice(1).toLowerCase()], size: req.file.size, data: req.file.buffer };
  const application = await Application.create({ job: job._id, applicant: req.user._id, note: req.body.note, resume, history: [{ status: 'applied' }] });
  await Job.updateOne({ _id: job._id }, { $inc: { applicationsCount: 1 } });
  await notifyMany({ users: await hiringTeam(job), actor: req.user._id, type: 'application', text: job.title, link: `/jobs/${job._id}/applicants` });
  const { resume: { data, ...file }, ...rest } = application.toObject();
  res.status(201).json({ ...rest, resume: file });
}

export async function mine(req, res) {
  const filter = { applicant: req.user._id };
  if (req.query.status) filter.status = req.query.status;
  const query = Application.find(filter).sort({ updatedAt: -1 }).populate({ path: 'job', select: 'title company type workplace location firm closed deadline', populate: { path: 'firm', select: 'name slug logo' } });
  res.json(await paginate(query, req.query));
}

export async function withdraw(req, res) {
  const application = found(await Application.findOne({ _id: req.params.applicationId, applicant: req.user._id }), 'Application');
  if (application.status === 'withdrawn') return res.json(application);
  application.status = 'withdrawn';
  application.history.push({ status: 'withdrawn' });
  await application.save();
  await Job.updateOne({ _id: application.job }, { $inc: { applicationsCount: -1 } });
  res.json(application);
}

/** A job's applicants for the people hiring, with how many sit at each stage. */
export async function applicants(req, res) {
  const job = found(await Job.findById(req.params.id).lean(), 'Job');
  await assertCanHire(req.user, job);
  const filter = { job: job._id, status: req.query.status || { $ne: 'withdrawn' } };
  const [page, counts] = await Promise.all([
    paginate(Application.find(filter).sort({ _id: -1 }).populate('applicant', `${CARD} location skills`), req.query),
    Application.aggregate([{ $match: { job: job._id } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
  ]);
  res.json({ ...page, job: { _id: job._id, title: job.title, company: job.company }, counts: Object.fromEntries(counts.map(({ _id, count }) => [_id, count])) });
}

export async function setStatus(req, res) {
  const application = found(await Application.findById(req.params.applicationId), 'Application');
  const job = found(await Job.findById(application.job).lean(), 'Job');
  await assertCanHire(req.user, job);
  if (application.status === 'withdrawn') throw new ApiError(409, 'The applicant withdrew this application');
  const { status, interviewAt, interviewNote } = req.body;
  if (status === 'interview' && !interviewAt) throw new ApiError(400, 'Choose the interview date and time');
  const changed = status !== application.status;
  application.status = status;
  application.interview = status === 'interview' ? { at: interviewAt, note: interviewNote } : undefined;
  if (changed) application.history.push({ status });
  await application.save();
  if (changed || status === 'interview') await notify({ user: application.applicant, actor: req.user._id, type: 'application_status', text: `${STATUS_TEXT[status]}: ${job.title}`, link: `/jobs/${job._id}` });
  res.json(application);
}

/** The resume file, for the applicant and the people hiring only. */
export async function resume(req, res) {
  const application = found(await Application.findById(req.params.applicationId).select('+resume.data'), 'Application');
  if (!same(application.applicant, req.user._id)) await assertCanHire(req.user, found(await Job.findById(application.job).lean(), 'Job'));
  const { name, mime, data } = application.resume;
  res
    .set({ 'Cache-Control': 'no-store', 'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(name)}`, 'X-Content-Type-Options': 'nosniff' })
    .type(mime || 'application/octet-stream')
    .send(data);
}
