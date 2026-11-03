import ChatState from '../models/ChatState.js';
import Message from '../models/Message.js';
import User from '../models/User.js';
import { CARD } from '../config/constants.js';
import { hiddenIds, isBlockedBetween } from '../services/blocks.js';
import { canMessage, pair } from '../services/chat.js';
import { announceReaction, deliverMessage, emitTo, isOnline } from '../services/realtime.js';
import { saveFile } from '../services/storage.js';
import { ApiError, found } from '../utils/errors.js';
import { has, same } from '../utils/shape.js';

const PAGE = 30;
const PIN_LIMIT = 3;

/**
 * The viewer's chats, latest activity first with pinned ones on top (in the order they were pinned). Hidden chats are
 * left out, or are the only ones listed with `hidden`. Chats with blocked members never appear.
 */
export async function conversations(req, res) {
  const me = req.user._id;
  const [blocked, states] = await Promise.all([hiddenIds(req.user), ChatState.find({ user: me }).lean()]);
  const hiddenChats = states.filter((state) => state.hidden).map((state) => state.other);
  const pins = states.filter((state) => state.pinnedAt);
  const people = req.query.hidden ? { $in: hiddenChats, $nin: blocked } : { $nin: [...blocked, ...hiddenChats] };
  const rows = await Message.aggregate([
    { $match: { $or: [{ from: me }, { to: me }] } },
    { $sort: { _id: -1 } },
    {
      $group: {
        _id: { $cond: [{ $eq: ['$from', me] }, '$to', '$from'] },
        last: { $first: '$$ROOT' },
        reaction: { $top: { sortBy: { 'lastReaction.at': -1 }, output: { at: '$lastReaction.at', by: '$lastReaction.user', emoji: '$lastReaction.emoji', author: '$from' } } },
        unread: { $sum: { $cond: [{ $and: [{ $eq: ['$to', me] }, { $eq: ['$read', false] }] }, 1, 0] } },
      },
    },
    { $match: { _id: people } },
    // Pinned chats sort first here too, so the 50-chat limit never drops one that hasn't been active lately.
    { $addFields: { activity: { $max: ['$last.createdAt', '$reaction.at'] }, pinned: { $in: ['$_id', pins.map((state) => state.other)] } } },
    { $sort: { pinned: -1, activity: -1 } },
    { $limit: 50 },
  ]);
  const users = await User.find({ _id: { $in: rows.map((row) => row._id) } }).select(CARD).lean();
  const byId = new Map(users.map((user) => [String(user._id), user]));
  const pinnedAt = new Map(pins.map((state) => [String(state.other), state.pinnedAt]));
  const pinTime = (item) => pinnedAt.get(String(item.user._id));
  const items = rows
    .filter((row) => byId.has(String(row._id)))
    .map((row) => ({
      user: byId.get(String(row._id)),
      last: row.last,
      reaction: row.reaction.at > row.last.createdAt ? row.reaction : null,
      activity: row.activity,
      unread: row.unread,
      pinned: row.pinned,
    }))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || (a.pinned ? pinTime(a) - pinTime(b) : 0));
  res.json({ items });
}

/** Pins (up to 3) or hides a chat for the viewer only. Hiding also unpins it, and new messages don't bring it back. */
export async function setState(req, res) {
  const me = req.user._id;
  const other = found(await User.exists({ _id: req.params.userId }), 'User')._id;
  const { pinned, hidden } = req.body;
  const state = (await ChatState.findOne({ user: me, other })) ?? new ChatState({ user: me, other });
  if (hidden !== undefined) state.hidden = hidden;
  if (hidden || pinned === false) state.pinnedAt = undefined;
  if (pinned && !state.pinnedAt) {
    if (state.hidden) throw new ApiError(400, 'Unhide this chat to pin it');
    if ((await ChatState.countDocuments({ user: me, other: { $ne: other }, pinnedAt: { $ne: null } })) >= PIN_LIMIT) {
      throw new ApiError(400, 'You can pin up to 3 chats. Unpin one to pin this.');
    }
    state.pinnedAt = new Date();
  }
  await state.save();
  res.json({ pinned: Boolean(state.pinnedAt), hidden: state.hidden });
}

/**
 * The viewer's reaction to a message in one of their chats: the same emoji again removes it, a different one replaces
 * it (one reaction per person). Both people see the change at once.
 */
export async function react(req, res) {
  const me = req.user._id;
  const message = found(await Message.findOne({ _id: req.params.messageId, $or: [{ from: me }, { to: me }] }), 'Message');
  if (await isBlockedBetween(message.from, message.to)) throw new ApiError(403, "You can't react in this chat");
  const { emoji } = req.body;
  const removing = message.reactions.some((reaction) => same(reaction.user, me) && reaction.emoji === emoji);
  message.reactions = message.reactions.filter((reaction) => !same(reaction.user, me));
  if (!removing) message.reactions.push({ user: me, emoji, at: new Date() });
  const newest = message.reactions.reduce((latest, reaction) => (!latest || reaction.at > latest.at ? reaction : latest), null);
  message.lastReaction = newest ? { user: newest.user, emoji: newest.emoji, at: newest.at } : undefined;
  await message.save();
  const update = { _id: message._id, reactions: message.reactions };
  [message.from, message.to].forEach((user) => emitTo(user, 'message:update', update));
  if (!removing && !same(message.from, me)) announceReaction(message, req.user, emoji).catch((error) => console.warn(`Reaction alert failed: ${error.message}`));
  res.json(update);
}

/**
 * One page of a thread, oldest first: the latest messages, older ones before `before`, or only new ones after `after`
 * while polling. Opening it marks incoming messages read (telling the sender at once) and reports `seenUntil`, the newest
 * of the viewer's messages the other person has read, and whether they are active.
 */
export async function thread(req, res) {
  const me = req.user._id;
  const other = found(await User.findById(req.params.userId).select(`${CARD} memberships lastActiveAt`), 'User');
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
  let details = {};
  if (!after && !before) {
    const state = await ChatState.findOne({ user: me, other: other._id }).lean();
    const chat = { pinned: Boolean(state?.pinnedAt), hidden: Boolean(state?.hidden) };
    details = { user: other, canMessage: await canMessage(req.user, other), blockedByMe: has(req.user.blocked, other._id), chat };
  }
  res.json({ items, hasMore, seenUntil: seen?._id ?? null, presence, ...details });
}

/** The person being messaged, if the viewer is allowed to message them. */
async function recipient(req) {
  const other = found(await User.findById(req.params.userId).select('memberships'), 'User');
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
