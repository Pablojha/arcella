import Connection from '../models/Connection.js';
import User from '../models/User.js';
import { CARD } from '../config/constants.js';
import { isBlockedBetween } from '../services/blocks.js';
import { notify } from '../services/notify.js';
import { ApiError, found } from '../utils/errors.js';
import { same } from '../utils/shape.js';

function otherUser(req) {
  if (same(req.params.userId, req.user._id)) throw new ApiError(400, "That's your own profile");
  return req.params.userId;
}

async function acceptRequest(conn, me) {
  conn.status = 'accepted';
  await conn.save();
  await User.updateMany({ _id: { $in: [conn.from, conn.to] } }, { $inc: { connectionsCount: 1 } });
  await notify({ user: conn.from, actor: me._id, type: 'connect_accept', link: `/u/${me.username}` });
  return { status: 'connected' };
}

export async function list(req, res) {
  const ids = await Connection.idsOf(req.user._id);
  const items = await User.find({ _id: { $in: ids } }).select(`${CARD} college`).populate('college', 'short').sort({ name: 1 }).lean();
  res.json({ items: items.map((user) => ({ ...user, status: 'connected' })) });
}

export async function requests(req, res) {
  const me = req.user._id;
  const [incoming, outgoing] = await Promise.all([
    Connection.find({ to: me, status: 'pending' }).sort({ _id: -1 }).populate('from', CARD).lean(),
    Connection.find({ from: me, status: 'pending' }).sort({ _id: -1 }).populate('to', CARD).lean(),
  ]);
  res.json({
    incoming: incoming.filter((row) => row.from).map((row) => ({ ...row.from, status: 'incoming' })),
    outgoing: outgoing.filter((row) => row.to).map((row) => ({ ...row.to, status: 'outgoing' })),
  });
}

export async function send(req, res) {
  const other = otherUser(req);
  found(await User.exists({ _id: other }), 'User');
  if (await isBlockedBetween(req.user._id, other)) throw new ApiError(403, "You can't connect with this member");
  const existing = await Connection.between(req.user._id, other);
  if (existing?.status === 'accepted') return res.json({ status: 'connected' });
  if (existing && same(existing.to, req.user._id)) return res.json(await acceptRequest(existing, req.user));
  if (!existing) {
    await Connection.create({ from: req.user._id, to: other });
    await notify({ user: other, actor: req.user._id, type: 'connect_request', link: '/network?tab=requests' });
  }
  res.status(201).json({ status: 'outgoing' });
}

export async function accept(req, res) {
  const conn = found(await Connection.findOne({ from: otherUser(req), to: req.user._id, status: 'pending' }), 'Request');
  res.json(await acceptRequest(conn, req.user));
}

/** Ignores an incoming request, withdraws an outgoing one, or removes a connection. */
export async function remove(req, res) {
  await Connection.sever(req.user._id, otherUser(req));
  res.json({ status: 'none' });
}
