import GroupMessage from '../models/GroupMessage.js';
import { CARD } from '../config/constants.js';
import { hiddenIds } from '../services/blocks.js';
import { removeContent } from '../services/content.js';
import { assertCanManage, assertMember } from '../utils/access.js';
import { found } from '../utils/errors.js';

const PAGE = 50;
const AUTHOR = { path: 'author', select: `${CARD} isAdmin` };

/**
 * A college group's chat, oldest first: the latest page, the page before `before`, or only messages after
 * `after` while polling. Messages from members hidden from the viewer are left out.
 */
export async function list(req, res) {
  assertMember(req.user, req.params.id);
  const { after, before } = req.query;
  const filter = { college: req.params.id, author: { $nin: await hiddenIds(req.user) } };
  if (after) {
    const items = await GroupMessage.find({ ...filter, _id: { $gt: after } }).sort({ _id: 1 }).limit(100).populate(AUTHOR).lean();
    return res.json({ items });
  }
  if (before) filter._id = { $lt: before };
  const rows = await GroupMessage.find(filter).sort({ _id: -1 }).limit(PAGE + 1).populate(AUTHOR).lean();
  res.json({ items: rows.slice(0, PAGE).reverse(), hasMore: rows.length > PAGE });
}

export async function send(req, res) {
  assertMember(req.user, req.params.id);
  const message = await GroupMessage.create({ college: req.params.id, author: req.user._id, text: req.body.text });
  await message.populate(AUTHOR);
  res.status(201).json(message);
}

/** Authors remove their own messages; the college admin, co-admin and site admins remove any. */
export async function remove(req, res) {
  const message = found(await GroupMessage.findOne({ _id: req.params.messageId, college: req.params.id }), 'Message');
  await assertCanManage(req.user, message.author, message.college);
  await removeContent('chat', message._id);
  res.json({ ok: true });
}
