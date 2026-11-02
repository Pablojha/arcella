import { isObjectIdOrHexString } from 'mongoose';
import { Server } from 'socket.io';
import User from '../models/User.js';
import { env } from '../config/env.js';
import { userFromToken } from '../middleware/auth.js';
import { canMessage } from './chat.js';

const PERMISSION_TTL_MS = 60_000;
const online = new Map();
let io = null;

export const emitTo = (userId, event, payload) => io?.to(`user:${userId}`).emit(event, payload);
export const isOnline = (userId) => online.has(String(userId));

/** Sends a new message to every open tab and device of both people. */
export function deliverMessage(message) {
  const payload = message.toObject();
  emitTo(message.to, 'message:new', payload);
  emitTo(message.from, 'message:new', payload);
}

/**
 * Socket.IO on the API server. Each signed-in socket joins its user's room, so messages, read receipts and typing reach
 * all of that person's tabs and devices. Who is online lives in memory (one server instance); when someone's last socket
 * closes, their "last active" time is saved.
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
    socket.join(`user:${id}`);
    online.set(id, (online.get(id) ?? 0) + 1);

    // Typing dots go only to people this user may message; the check is remembered for a minute.
    socket.on('typing', async ({ to, typing } = {}) => {
      try {
        if (!isObjectIdOrHexString(to)) return;
        if ((allowedUntil.get(to) ?? 0) < Date.now()) {
          const other = await User.findById(to).select('verified college batch');
          if (!other || !(await canMessage(user, other))) return;
          allowedUntil.set(to, Date.now() + PERMISSION_TTL_MS);
        }
        emitTo(to, 'typing', { from: id, typing: Boolean(typing) });
      } catch {
        // A failed check simply drops this typing update.
      }
    });

    socket.on('disconnect', () => {
      const left = online.get(id) - 1;
      if (left > 0) return online.set(id, left);
      online.delete(id);
      User.updateOne({ _id: id }, { lastActiveAt: new Date() }).catch(() => {});
    });
  });
}
