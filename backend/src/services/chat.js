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
