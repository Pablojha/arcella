import { isObjectIdOrHexString } from 'mongoose';
import { Server } from 'socket.io';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { userFromToken } from '../middleware/auth.js';
import { isMember } from '../utils/access.js';
import { hiddenIds } from './blocks.js';
import { canMessage, isHiddenChat, messagePreview, unreadMessages } from './chat.js';
import { pushTo } from './push.js';

const PERMISSION_TTL_MS = 60_000;
const PREVIEW_LENGTH = 180;
const online = new Map();
// Per member, each open app window: whether it is on screen, which chat it shows, and its device's push endpoint.
const screens = new Map();
let io = null;

export const emitTo = (userId, event, payload) => io?.to(`user:${userId}`).emit(event, payload);

const groupRoom = (collegeId) => `college:${collegeId}`;

/**
 * Tells every open chat of a college's group that something changed. New messages are only announced: each chat then
 * fetches them, so members never receive messages from people they blocked or who blocked them.
 */
export const emitToGroup = (collegeId, event, payload) => io?.to(groupRoom(collegeId)).emit(event, { college: String(collegeId), ...payload });
export const isOnline = (userId) => online.has(String(userId));

/**
 * Closes the live connections of signed-out devices. With `userId`, the account's connections from tokens without a
 * device (from before devices existed) close too.
 */
export function disconnectDevices(deviceIds = [], userId) {
  const rooms = [...deviceIds.map((id) => `device:${id}`), ...(userId ? [`legacy:${userId}`] : [])];
  if (io && rooms.length) io.in(rooms).disconnectSockets(true);
}

/** A Cloudinary avatar as a small square image a notification can show (other images can't be reached by URL). */
const notificationIcon = (avatar) => (avatar?.includes('/image/upload/') ? avatar.replace('/image/upload/', '/image/upload/c_fill,g_face,w_192,h_192,f_jpg/') : undefined);

/**
 * Tells a member about a message or reaction in their chat with `alert.chat`: nothing while that chat is on one of
 * their screens, a banner in their open app windows, and a push notification on their other devices.
 */
async function alertMember(userId, alert) {
  const visible = [...(screens.get(String(userId))?.values() ?? [])].filter((screen) => screen.visible);
  if (visible.some((screen) => screen.chat === alert.chat)) return;
  emitTo(userId, 'message:alert', alert);
  await pushTo(userId, alert, visible.map((screen) => screen.endpoint).filter(Boolean));
}

/** The notification for a chat with `sender`, grouped per chat; one the member hid only says "New message". */
async function chatAlert(userId, sender, hidden, body) {
  const chat = String(sender._id);
  const base = { chat, url: `/messages/${chat}`, tag: `chat-${chat}`, badge: await unreadMessages(userId) };
  if (hidden) return { ...base, title: 'Arcella', body: 'New message' };
  return { ...base, title: sender.name, body: body.slice(0, PREVIEW_LENGTH), icon: notificationIcon(sender.avatar), user: { _id: chat, name: sender.name, avatar: sender.avatar } };
}

async function announceMessage(message) {
  const [sender, hidden] = await Promise.all([User.findById(message.from).select('name avatar').lean(), isHiddenChat(message.to, message.from)]);
  if (sender) await alertMember(message.to, await chatAlert(message.to, sender, hidden, messagePreview(message)));
}

/** Sends a new message to every open tab and device of both people, and notifies the recipient. */
export function deliverMessage(message) {
  const payload = message.toObject();
  emitTo(message.to, 'message:new', payload);
  emitTo(message.from, 'message:new', payload);
  announceMessage(message).catch((error) => console.warn(`Message alert failed: ${error.message}`));
}

/** "Isha reacted ❤️ to your message", for the message's author; reactions in a chat they hid stay quiet. */
export async function announceReaction(message, reactor, emoji) {
  if (await isHiddenChat(message.from, reactor._id)) return;
  await alertMember(message.from, await chatAlert(message.from, reactor, false, `${reactor.name.split(' ')[0]} reacted ${emoji} to your message`));
}

/**
 * Socket.IO on the API server. Each signed-in socket joins its user's room, so messages, read receipts and typing reach
 * all of that person's tabs and devices. Who is online, and what each window shows, lives in memory (one server
 * instance); when someone's last socket closes, their "last active" time is saved.
 */
export function startRealtime(server) {
  io = new Server(server, { cors: { origin: env.clientUrls } });

  io.use(async (socket, next) => {
    try {
      socket.data.user = await userFromToken(socket.handshake.auth?.token ?? '');
      next();
    } catch (error) {
      next(error);
    }
  });

  io.on('connection', (socket) => {
    const { user } = socket.data;
    const id = String(user._id);
    const allowedUntil = new Map();
    let hidden = { rooms: [], until: 0 };
    socket.join([`user:${id}`, user.$locals.device ? `device:${user.$locals.device}` : `legacy:${id}`]);
    online.set(id, (online.get(id) ?? 0) + 1);
    if (!screens.has(id)) screens.set(id, new Map());

    // Typing dots go only to people this user may message; the check is remembered for a minute.
    socket.on('typing', async ({ to, typing } = {}) => {
      try {
        if (!isObjectIdOrHexString(to)) return;
        if ((allowedUntil.get(to) ?? 0) < Date.now()) {
          const other = await User.findById(to).select('memberships');
          if (!other || !(await canMessage(user, other))) return;
          allowedUntil.set(to, Date.now() + PERMISSION_TTL_MS);
        }
        emitTo(to, 'typing', { from: id, typing: Boolean(typing) });
      } catch {
        // A failed check simply drops this typing update.
      }
    });

    // An open group chat joins its college's room, checked against the member's memberships as they are now.
    socket.on('group:join', async ({ college } = {}, ack) => {
      let joined = false;
      try {
        const member = isObjectIdOrHexString(college) && (await User.findById(id).select('memberships isAdmin'));
        if (member && isMember(member, college)) {
          socket.join(groupRoom(college));
          joined = true;
        }
      } catch {
        // Without the room, the chat keeps polling.
      }
      if (typeof ack === 'function') ack(joined);
    });
    socket.on('group:leave', ({ college } = {}) => {
      if (isObjectIdOrHexString(college)) socket.leave(groupRoom(college));
    });

    // Typing in a group reaches its open chats, except people this member blocked or was blocked by (checked each minute).
    socket.on('group:typing', async ({ college, typing } = {}) => {
      try {
        const room = isObjectIdOrHexString(college) && groupRoom(college);
        if (!room || !socket.rooms.has(room)) return;
        if (hidden.until < Date.now()) hidden = { rooms: (await hiddenIds(user)).map((other) => `user:${other}`), until: Date.now() + PERMISSION_TTL_MS };
        socket
          .to(room)
          .except(hidden.rooms)
          .emit('group:typing', { college, user: { _id: id, name: user.name, avatar: user.avatar }, typing: Boolean(typing) });
      } catch {
        // A failed check simply drops this typing update.
      }
    });

    // Each window says whether it is on screen, which chat it shows and which device it is on, so notifications skip it.
    socket.on('presence', ({ visible, chat, endpoint } = {}, ack) => {
      screens.get(id)?.set(socket.id, {
        visible: Boolean(visible),
        chat: isObjectIdOrHexString(chat) ? String(chat) : null,
        endpoint: typeof endpoint === 'string' ? endpoint.slice(0, 1000) : null,
      });
      if (typeof ack === 'function') ack();
    });

    socket.on('disconnect', () => {
      screens.get(id)?.delete(socket.id);
      const left = online.get(id) - 1;
      if (left > 0) return online.set(id, left);
      online.delete(id);
      screens.delete(id);
      User.updateOne({ _id: id }, { lastActiveAt: new Date() }).catch(() => {});
    });
  });
}
