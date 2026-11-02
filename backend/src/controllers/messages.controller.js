import Message from '../models/Message.js';
import User from '../models/User.js';
import { CARD } from '../config/constants.js';
import { hiddenIds } from '../services/blocks.js';
import { canMessage, pair } from '../services/chat.js';
import { deliverMessage, emitTo, isOnline } from '../services/realtime.js';
import { saveFile } from '../services/storage.js';
import { ApiError, found } from '../utils/errors.js';
import { has, same } from '../utils/shape.js';

const PAGE = 30;

export async function conversations(req, res) {
  const me = req.user._id;
  const hidden = await hiddenIds(req.user);
  const rows = await Message.aggregate([
    { $match: { $or: [{ from: me }, { to: me }] } },
    { $sort: { _id: -1 } },
    {
      $group: {
        _id: { $cond: [{ $eq: ['$from', me] }, '$to', '$from'] },
        last: { $first: '$$ROOT' },
        unread: { $sum: { $cond: [{ $and: [{ $eq: ['$to', me] }, { $eq: ['$read', false] }] }, 1, 0] } },
      },
    },
    { $match: { _id: { $nin: hidden } } },
    { $sort: { 'last._id': -1 } },
    { $limit: 50 },
  ]);
  const users = await User.find({ _id: { $in: rows.map((row) => row._id) } }).select(CARD).lean();
  const byId = new Map(users.map((user) => [String(user._id), user]));
  const items = rows.filter((row) => byId.has(String(row._id))).map((row) => ({ user: byId.get(String(row._id)), last: row.last, unread: row.unread }));
  res.json({ items });
}

/**
 * One page of a thread, oldest first: the latest messages, older ones before `before`, or only new ones after `after`
 * while polling. Opening it marks incoming messages read (telling the sender at once) and reports `seenUntil`, the newest
 * of the viewer's messages the other person has read, and whether they are active.
 */
export async function thread(req, res) {
  const me = req.user._id;
  const other = found(await User.findById(req.params.userId).select(`${CARD} college batch lastActiveAt`), 'User');
  const { after, before } = req.query;
  const filter = pair(me, other._id);
  let items;
  let hasMore = false;
  if (after) items = await Message.find({ ...filter, _id: { $gt: after } }).sort({ _id: 1 }).lean();
  else {
    const rows = await Message.find(before ? { ...filter, _id: { $lt: before } } : filter).sort({ _id: -1 }).limit(PAGE + 1).lean();
    hasMore = rows.length > PAGE;
    items = rows.slice(0, PAGE).reverse();
  }
  const { modifiedCount } = await Message.updateMany({ from: other._id, to: me, read: false }, { read: true });
  if (modifiedCount) {
    const lastRead = await Message.findOne({ from: other._id, to: me }).sort({ _id: -1 }).select('_id').lean();
    emitTo(other._id, 'message:seen', { by: me, until: lastRead._id });
  }
  const seen = await Message.findOne({ from: me, to: other._id, read: true }).sort({ _id: -1 }).select('_id').lean();
  const presence = { online: isOnline(other._id), activeAt: other.lastActiveAt ?? null };
  const details = after || before ? {} : { user: other, canMessage: await canMessage(req.user, other), blockedByMe: has(req.user.blocked, other._id) };
  res.json({ items, hasMore, seenUntil: seen?._id ?? null, presence, ...details });
}

/** The person being messaged, if the viewer is allowed to message them. */
async function recipient(req) {
  const other = found(await User.findById(req.params.userId).select('college batch verified'), 'User');
  if (same(other._id, req.user._id)) throw new ApiError(400, "You can't message yourself");
  if (!(await canMessage(req.user, other))) throw new ApiError(403, 'You can message your connections and verified batchmates');
  return other;
}

/** A text message or a GIF. */
export async function send(req, res) {
  const other = await recipient(req);
  const message = await Message.create({ from: req.user._id, to: other._id, text: req.body.text, gif: req.body.gif });
  deliverMessage(message);
  res.status(201).json(message);
}

/** A photo, video or voice note; its size, length and waveform are measured by the sender's app. */
export async function sendAttachment(req, res) {
  const other = await recipient(req);
  const { kind, width, height, duration, waveform } = req.body;
  const url = await saveFile(req.file, 'messages');
  const content = kind === 'voice' ? { voice: { url, duration, waveform } } : { media: { url, kind, width, height, duration } };
  const message = await Message.create({ from: req.user._id, to: other._id, ...content });
  deliverMessage(message);
  res.status(201).json(message);
}
