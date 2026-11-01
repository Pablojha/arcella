import Notification from '../models/Notification.js';
import { same } from '../utils/shape.js';

/** Creates an in-app notification, skipping people acting on their own content. */
export async function notify({ user, actor, type, text, link }) {
  if (same(user, actor)) return;
  await Notification.create({ user, actor, type, text, link });
}
