import path from 'node:path';
import Resource from '../models/Resource.js';
import { CARD } from '../config/constants.js';
import { removeContent } from '../services/content.js';
import { saveFile } from '../services/storage.js';
import { assertCanManage } from '../utils/access.js';
import { ApiError, found } from '../utils/errors.js';
import { paginate, toggle } from '../utils/query.js';
import { withCount } from '../utils/shape.js';
import { searchRegex } from '../utils/text.js';

const UPLOADER = { path: 'uploader', select: CARD };
const shape = (viewerId) => (resource) => withCount(resource, 'bookmarks', viewerId, 'bookmarked');

export async function list(req, res) {
  const { q, semester, kind, saved } = req.query;
  const filter = {};
  if (semester) filter.semester = semester;
  if (kind) filter.kind = kind;
  if (saved) filter.bookmarks = req.user._id;
  if (q) {
    const rx = searchRegex(q);
    filter.$or = [{ title: rx }, { subject: rx }, { description: rx }];
  }
  res.json(await paginate(Resource.find(filter).sort({ _id: -1 }).populate(UPLOADER), req.query, shape(req.user._id)));
}

export async function create(req, res) {
  if (!req.file) throw new ApiError(400, 'Attach the file you want to share');
  const { originalname: name, size } = req.file;
  const file = { url: await saveFile(req.file, 'resources'), name, size, ext: path.extname(name).slice(1).toLowerCase() };
  const resource = await Resource.create({ ...req.body, file, uploader: req.user._id });
  await resource.populate(UPLOADER);
  res.status(201).json(shape(req.user._id)(resource.toObject()));
}

export async function bookmark(req, res) {
  const { active, count } = await toggle(Resource, req.params.id, 'bookmarks', req.user._id);
  res.json({ bookmarked: active, bookmarksCount: count });
}

/** Counts the download and hands back the file location. */
export async function download(req, res) {
  const resource = await Resource.findByIdAndUpdate(req.params.id, { $inc: { downloads: 1 } }, { new: true }).select('file downloads').lean();
  const { file, downloads } = found(resource, 'Resource');
  res.json({ url: file.url, name: file.name, downloads });
}

export async function remove(req, res) {
  const resource = found(await Resource.findById(req.params.id), 'Resource');
  await assertCanManage(req.user, resource.uploader);
  await removeContent('resource', resource._id);
  res.json({ ok: true });
}
