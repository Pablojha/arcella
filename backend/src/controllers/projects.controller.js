import Project from '../models/Project.js';
import { CARD } from '../config/constants.js';
import { removeContent } from '../services/content.js';
import { notify } from '../services/notify.js';
import { saveFiles } from '../services/storage.js';
import { assertCanManage } from '../utils/access.js';
import { ApiError, found } from '../utils/errors.js';
import { paginate, toggle } from '../utils/query.js';
import { withCount } from '../utils/shape.js';
import { searchRegex } from '../utils/text.js';

const OWNER = { path: 'owner', select: CARD };
const shape = (viewerId) => (project) => withCount(project, 'appreciations', viewerId, 'appreciated');

async function ownProject(req) {
  const project = found(await Project.findById(req.params.id), 'Project');
  await assertCanManage(req.user, project.owner);
  return project;
}

export async function list(req, res) {
  const { q, category, owner } = req.query;
  const filter = {};
  if (category) filter.category = category;
  if (owner) filter.owner = owner;
  if (q) {
    const rx = searchRegex(q);
    filter.$or = [{ title: rx }, { tools: rx }, { site: rx }];
  }
  const query = Project.find(filter).sort({ _id: -1 }).select('-description').populate(OWNER);
  res.json(await paginate(query, req.query, shape(req.user?._id)));
}

export async function get(req, res) {
  const project = found(await Project.findById(req.params.id).populate(OWNER).lean(), 'Project');
  res.json(shape(req.user?._id)(project));
}

export async function create(req, res) {
  if (!req.files?.length) throw new ApiError(400, 'Add at least one image of your project');
  const project = await Project.create({ ...req.body, owner: req.user._id, images: await saveFiles(req.files, 'projects') });
  res.status(201).json(project);
}

export async function update(req, res) {
  const project = await ownProject(req);
  project.set(req.body);
  await project.save();
  res.json(project);
}

export async function remove(req, res) {
  const project = await ownProject(req);
  await removeContent('project', project._id);
  res.json({ ok: true });
}

export async function appreciate(req, res) {
  const { doc, active, count } = await toggle(Project, req.params.id, 'appreciations', req.user._id);
  if (active) await notify({ user: doc.owner, actor: req.user._id, type: 'appreciate', text: doc.title, link: `/projects/${doc._id}` });
  res.json({ appreciated: active, appreciationsCount: count });
}
