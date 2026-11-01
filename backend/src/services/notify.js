import Notification from '../models/Notification.js';
import { same } from '../utils/shape.js';

/** Creates an in-app notification, skipping people acting on their own content. */
export async function notify({ user, actor, type, text, link }) {
  if (same(user, actor)) return;
  await Notification.create({ user, actor, type, text, link });
}

/** The same notification for many people at once (again skipping the actor). */
export async function notifyMany({ users, actor, ...note }) {
  const docs = users.filter((user) => !same(user, actor)).map((user) => ({ user, actor, ...note }));
  if (docs.length) await Notification.insertMany(docs, { ordered: false });
}
