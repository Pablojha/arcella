import Critique from '../models/Critique.js';
import Project from '../models/Project.js';
import { CARD, CRITERIA } from '../config/constants.js';
import { notify } from '../services/notify.js';
import { ApiError, found } from '../utils/errors.js';
import { same } from '../utils/shape.js';

export async function list(req, res) {
  const items = await Critique.find({ project: req.params.id }).sort({ _id: -1 }).populate('author', CARD).lean();
  const average = (key) => (items.length ? Number((items.reduce((sum, item) => sum + item.scores[key], 0) / items.length).toFixed(1)) : 0);
  res.json({ items, count: items.length, averages: Object.fromEntries(CRITERIA.map((key) => [key, average(key)])) });
}

/** Creates or updates the viewer's critique of a project that asked for feedback. */
export async function save(req, res) {
  const project = found(await Project.findById(req.params.id).select('owner title critiqueOpen'), 'Project');
  if (!project.critiqueOpen) throw new ApiError(400, 'This project is not open for critique');
  if (same(project.owner, req.user._id)) throw new ApiError(400, "You can't critique your own project");
  const filter = { project: project._id, author: req.user._id };
  const isNew = !(await Critique.exists(filter));
  const critique = await Critique.findOneAndUpdate(filter, { $set: req.body }, { upsert: true, new: true, runValidators: true }).populate('author', CARD);
  if (isNew) await notify({ user: project.owner, actor: req.user._id, type: 'critique', text: project.title, link: `/projects/${project._id}` });
  res.json(critique);
}
