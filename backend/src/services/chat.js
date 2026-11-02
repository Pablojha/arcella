import ChatState from '../models/ChatState.js';
import Connection from '../models/Connection.js';
import Message from '../models/Message.js';
import { same } from '../utils/shape.js';
import { isBlockedBetween } from './blocks.js';

/** Filter for the messages between two people, either way. */
export const pair = (a, b) => ({ $or: [{ from: a, to: b }, { from: b, to: a }] });

/** Connections, verified batchmates, or people who already share a thread may message each other, unless either blocked the other. */
export async function canMessage(me, other) {
  if (await isBlockedBetween(me._id, other._id)) return false;
  if (me.verified && other.verified && same(me.college, other.college) && me.batch === other.batch) return true;
  const ids = pair(me._id, other._id);
  return Boolean((await Connection.exists({ ...ids, status: 'accepted' })) || (await Message.exists(ids)));
}

/** The people whose chats this user has hidden from their list. */
export const hiddenChats = (userId) => ChatState.find({ user: userId, hidden: true }).distinct('other');

export const isHiddenChat = async (userId, otherId) => Boolean(await ChatState.exists({ user: userId, other: otherId, hidden: true }));

/** Unread messages for the badges; chats the user hid don't count. */
export const unreadMessages = async (userId) => Message.countDocuments({ to: userId, read: false, from: { $nin: await hiddenChats(userId) } });

/** What a message says in a notification: its text, or what kind of thing was sent. */
export function messagePreview(message) {
  if (message.text) return message.storyImage ? `Replied to your story: ${message.text}` : message.text;
  if (message.media) return message.media.kind === 'video' ? '🎥 Sent a video' : '📷 Sent a photo';
  if (message.voice) return '🎤 Sent a voice message';
  return message.gif ? 'Sent a GIF' : 'New message';
}
