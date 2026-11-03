import Notification from '../models/Notification.js';
import User from '../models/User.js';
import { same } from '../utils/shape.js';

/** Notification groups members can switch off. Anything else (security, verification, staff notices) always arrives. */
export const NOTIFICATION_GROUPS = {
  likes: ['like', 'comment_like', 'appreciate'],
  comments: ['comment', 'reply', 'critique', 'answer', 'accepted'],
  mentions: ['mention'],
  network: ['connect_request', 'connect_accept', 'follow'],
  posts: ['important', 'repost'],
  jobs: ['application', 'application_status'],
  mentoring: ['mentor_request', 'mentor_update'],
};

const groupOf = (type) => Object.keys(NOTIFICATION_GROUPS).find((group) => NOTIFICATION_GROUPS[group].includes(type));

/** Of `users`, those who switched off the group `type` belongs to. */
async function mutedAmong(users, type) {
  const group = groupOf(type);
  if (!group || !users.length) return new Set();
  return new Set((await User.find({ _id: { $in: users }, notificationsOff: group }).distinct('_id')).map(String));
}

/** Creates an in-app notification, skipping people acting on their own content and anyone who switched the kind off. */
export async function notify({ user, actor, type, text, link }) {
  if (same(user, actor) || (await mutedAmong([user], type)).size) return;
  await Notification.create({ user, actor, type, text, link });
}

/** The same notification for many people at once (again skipping the actor and anyone who switched it off). */
export async function notifyMany({ users, actor, ...note }) {
  const muted = await mutedAmong(users, note.type);
  const docs = users.filter((user) => !same(user, actor) && !muted.has(String(user))).map((user) => ({ user, actor, ...note }));
  if (docs.length) await Notification.insertMany(docs, { ordered: false });
}
