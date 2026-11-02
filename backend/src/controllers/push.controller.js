import PushSubscription from '../models/PushSubscription.js';
import { env } from '../config/env.js';
import { pushEnabled } from '../services/push.js';

/** The public key browsers need to subscribe; null while push isn't set up on the server. */
export const key = (req, res) => res.json({ key: pushEnabled ? env.vapid.publicKey : null });

/** Saves this device for push notifications, moving it to whoever is signed in on it now. */
export async function subscribe(req, res) {
  const { endpoint, keys } = req.body;
  await PushSubscription.findOneAndUpdate({ endpoint }, { user: req.user._id, keys }, { upsert: true });
  res.status(201).json({ ok: true });
}

/** Forgets this device (on sign-out, or when notifications are turned off). */
export async function unsubscribe(req, res) {
  await PushSubscription.deleteOne({ endpoint: req.body.endpoint, user: req.user._id });
  res.json({ ok: true });
}
