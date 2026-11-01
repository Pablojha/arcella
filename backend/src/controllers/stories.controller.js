import Connection from '../models/Connection.js';
import Message from '../models/Message.js';
import Story, { STORY_TTL_SECONDS } from '../models/Story.js';
import { CARD } from '../config/constants.js';
import { hiddenIds } from '../services/blocks.js';
import { removeContent } from '../services/content.js';
import { saveFile } from '../services/storage.js';
import { ApiError, found } from '../utils/errors.js';
import { has, same } from '../utils/shape.js';

/** Live stories from the viewer, their connections and (when verified) their college mates, minus blocked members. */
async function visibleTo(user) {
  const authors = { author: { $in: [user._id, ...(await Connection.idsOf(user._id))] } };
  return {
    createdAt: { $gt: new Date(Date.now() - STORY_TTL_SECONDS * 1000) },
    author: { $nin: await hiddenIds(user) },
    $or: user.verified ? [authors, { college: user.college }] : [authors],
  };
}

export async function list(req, res) {
  const me = req.user._id;
  const stories = await Story.find(await visibleTo(req.user)).sort({ createdAt: 1 }).populate('author', CARD).lean();
  const groups = new Map();
  for (const { author, viewers, ...story } of stories) {
    if (!author) continue;
    const key = String(author._id);
    if (!groups.has(key)) groups.set(key, { author, stories: [] });
    groups.get(key).stories.push({ ...story, seen: has(viewers, me), viewsCount: viewers.length });
  }
  const items = [...groups.values()].map((group) => ({ ...group, seen: group.stories.every((story) => story.seen) }));
  items.sort((a, b) => same(b.author, me) - same(a.author, me) || a.seen - b.seen);
  res.json({ items });
}

export async function create(req, res) {
  if (!req.file) throw new ApiError(400, 'Choose a photo for your story');
  const story = await Story.create({
    author: req.user._id,
    college: req.user.verified ? req.user.college : undefined,
    image: await saveFile(req.file, 'stories'),
    caption: req.body.caption,
  });
  res.status(201).json(story);
}

export async function view(req, res) {
  const visible = await visibleTo(req.user);
  visible.author.$ne = req.user._id;
  await Story.updateOne({ _id: req.params.id, ...visible }, { $addToSet: { viewers: req.user._id } });
  res.json({ ok: true });
}

export async function reply(req, res) {
  const story = found(await Story.findOne({ _id: req.params.id, ...(await visibleTo(req.user)) }), 'Story');
  if (same(story.author, req.user._id)) throw new ApiError(400, "You can't reply to your own story");
  res.status(201).json(await Message.create({ from: req.user._id, to: story.author, text: req.body.text, storyImage: story.image }));
}

export async function remove(req, res) {
  found(await Story.exists({ _id: req.params.id, author: req.user._id }), 'Story');
  await removeContent('story', req.params.id);
  res.json({ ok: true });
}
