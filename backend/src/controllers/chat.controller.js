import GroupMessage from '../models/GroupMessage.js';
import { CARD } from '../config/constants.js';
import { hiddenIds } from '../services/blocks.js';
import { removeContent } from '../services/content.js';
import { emitToGroup } from '../services/realtime.js';
import { saveFile } from '../services/storage.js';
import { assertCanManage, assertMember } from '../utils/access.js';
import { found } from '../utils/errors.js';
import { same } from '../utils/shape.js';

const PAGE = 50;
// Authors with what their badges need, and the people who reacted (named in the reactions sheet).
const AUTHOR = { path: 'author', select: `${CARD} isAdmin` };
const REACTORS = { path: 'reactions.user', select: 'name username avatar' };

/**
 * A college group's chat, oldest first: the latest page, the page before `before`, or only messages after
 * `after` while polling. Messages from members hidden from the viewer are left out.
 */
export async function list(req, res) {
  assertMember(req.user, req.params.id);
  const { after, before } = req.query;
  const filter = { college: req.params.id, author: { $nin: await hiddenIds(req.user) } };
  if (after) {
    const items = await GroupMessage.find({ ...filter, _id: { $gt: after } }).sort({ _id: 1 }).limit(100).populate([AUTHOR, REACTORS]).lean();
    return res.json({ items });
  }
  if (before) filter._id = { $lt: before };
  const rows = await GroupMessage.find(filter).sort({ _id: -1 }).limit(PAGE + 1).populate([AUTHOR, REACTORS]).lean();
  res.json({ items: rows.slice(0, PAGE).reverse(), hasMore: rows.length > PAGE });
}

/** Saves a message and tells the group's open chats, which fetch it themselves. */
async function post(req, content) {
  const message = await GroupMessage.create({ college: req.params.id, author: req.user._id, ...content });
  await message.populate([AUTHOR, REACTORS]);
  emitToGroup(req.params.id, 'group:new', { _id: message._id });
  return message;
}

/** A text message or a GIF. */
export async function send(req, res) {
  assertMember(req.user, req.params.id);
  res.status(201).json(await post(req, { text: req.body.text, gif: req.body.gif }));
}

/** A photo, video or voice note; its size, length and waveform are measured by the sender's app. */
export async function sendAttachment(req, res) {
  assertMember(req.user, req.params.id);
  const { kind, width, height, duration, waveform } = req.body;
  const url = await saveFile(req.file, 'groups');
  res.status(201).json(await post(req, kind === 'voice' ? { voice: { url, duration, waveform } } : { media: { url, kind, width, height, duration } }));
}

/** One reaction per member: the same emoji again removes it. Every open chat of the group sees the change. */
export async function react(req, res) {
  assertMember(req.user, req.params.id);
  const me = req.user._id;
  const message = found(await GroupMessage.findOne({ _id: req.params.messageId, college: req.params.id, author: { $nin: await hiddenIds(req.user) } }), 'Message');
  const removing = message.reactions.some((reaction) => same(reaction.user, me) && reaction.emoji === req.body.emoji);
  message.reactions = message.reactions.filter((reaction) => !same(reaction.user, me));
  if (!removing) message.reactions.push({ user: me, emoji: req.body.emoji, at: new Date() });
  await message.save();
  await message.populate(REACTORS);
  const update = { _id: message._id, reactions: message.reactions };
  emitToGroup(req.params.id, 'group:update', update);
  res.json(update);
}

/** Authors remove their own messages; the college admin, co-admin and site admins remove any. */
export async function remove(req, res) {
  const message = found(await GroupMessage.findOne({ _id: req.params.messageId, college: req.params.id }), 'Message');
  await assertCanManage(req.user, message.author, message.college);
  await removeContent('chat', message._id);
  res.json({ ok: true });
}
