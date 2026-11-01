import Firm from '../models/Firm.js';
import Job, { openRoles } from '../models/Job.js';
import { CARD } from '../config/constants.js';
import { removeContent } from '../services/content.js';
import { assertCanManage } from '../utils/access.js';
import { ApiError, found } from '../utils/errors.js';
import { paginate } from '../utils/query.js';
import { has, same } from '../utils/shape.js';
import { searchRegex } from '../utils/text.js';

export async function list(req, res) {
  const { q, type, location, remote, firm } = req.query;
  const filter = openRoles();
  if (type) filter.type = type;
  if (firm) filter.firm = firm;
  if (remote) filter.remote = true;
  if (location) filter.location = searchRegex(location);
  if (q) {
    const rx = searchRegex(q);
    filter.$or = [{ title: rx }, { company: rx }, { skills: rx }];
  }
  const query = Job.find(filter).sort({ _id: -1 }).select('-description').populate('firm', 'name slug logo');
  res.json(await paginate(query, req.query));
}

export async function get(req, res) {
  const job = await Job.findById(req.params.id).populate('firm', 'name slug logo city').populate('postedBy', CARD).lean();
  res.json(found(job, 'Job'));
}

export async function create(req, res) {
  const body = { ...req.body, postedBy: req.user._id };
  if (body.firm) {
    const firm = found(await Firm.findById(body.firm).select('name owner team'), 'Firm');
    if (!same(firm.owner, req.user._id) && !has(firm.team, req.user._id)) throw new ApiError(403, 'Only people who work at this firm can post its roles');
    body.company = firm.name;
  }
  if (!body.company) throw new ApiError(400, 'Company name is required');
  res.status(201).json(await Job.create(body));
}

export async function remove(req, res) {
  const job = found(await Job.findById(req.params.id), 'Job');
  await assertCanManage(req.user, job.postedBy);
  await removeContent('job', job._id);
  res.json({ ok: true });
}
