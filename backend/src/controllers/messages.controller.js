import Connection from '../models/Connection.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { CARD } from '../config/constants.js';
import { hiddenIds, isBlockedBetween } from '../services/blocks.js';
import { ApiError, found } from '../utils/errors.js';
import { has, same } from '../utils/shape.js';

const pair = (a, b) => ({ $or: [{ from: a, to: b }, { from: b, to: a }] });

/** Connections, verified batchmates, or people who already share a thread may message each other, unless either blocked the other. */
async function canMessage(me, other) {
  if (await isBlockedBetween(me._id, other._id)) return false;
  if (me.verified && other.verified && same(me.college, other.college) && me.batch === other.batch) return true;
  const ids = pair(me._id, other._id);
  return Boolean((await Connection.exists({ ...ids, status: 'accepted' })) || (await Message.exists(ids)));
}

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
 * Latest messages of a thread, or only those after `after` when polling. Marks incoming ones read
 * and reports `seenUntil`: the newest of the viewer's messages the other person has read.
 */
export async function thread(req, res) {
  const me = req.user._id;
  const other = found(await User.findById(req.params.userId).select(`${CARD} college batch`), 'User');
  const { after } = req.query;
  const filter = pair(me, other._id);
  const items = after
    ? await Message.find({ ...filter, _id: { $gt: after } }).sort({ _id: 1 }).lean()
    : (await Message.find(filter).sort({ _id: -1 }).limit(100).lean()).reverse();
  await Message.updateMany({ from: other._id, to: me, read: false }, { read: true });
  const seen = await Message.findOne({ from: me, to: other._id, read: true }).sort({ _id: -1 }).select('_id').lean();
  const details = after ? {} : { user: other, canMessage: await canMessage(req.user, other), blockedByMe: has(req.user.blocked, other._id) };
  res.json({ items, seenUntil: seen?._id ?? null, ...details });
}

export async function send(req, res) {
  const other = found(await User.findById(req.params.userId).select('college batch verified'), 'User');
  if (same(other._id, req.user._id)) throw new ApiError(400, "You can't message yourself");
  if (!(await canMessage(req.user, other))) throw new ApiError(403, 'You can message your connections and verified batchmates');
  res.status(201).json(await Message.create({ from: req.user._id, to: other._id, text: req.body.text }));
}
