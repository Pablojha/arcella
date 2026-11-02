import Connection from '../models/Connection.js';
import Notification from '../models/Notification.js';
import { unreadMessages } from '../services/chat.js';
import { paginate } from '../utils/query.js';

export async function list(req, res) {
  const query = Notification.find({ user: req.user._id }).sort({ _id: -1 }).populate('actor', 'name username avatar');
  res.json(await paginate(query, req.query));
}

export async function markRead(req, res) {
  await Notification.updateMany({ user: req.user._id, read: false }, { read: true });
  res.json({ ok: true });
}

/** Unread counts for the navigation badges, polled by the app; hidden chats don't count. */
export async function badges(req, res) {
  const me = req.user._id;
  const [messages, notifications, requests] = await Promise.all([
    unreadMessages(me),
    Notification.countDocuments({ user: me, read: false }),
    Connection.countDocuments({ to: me, status: 'pending' }),
  ]);
  res.json({ messages, notifications, requests });
}
