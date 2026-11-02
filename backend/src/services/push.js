import webpush from 'web-push';
import PushSubscription from '../models/PushSubscription.js';
import { env } from '../config/env.js';

const { publicKey, privateKey, subject } = env.vapid;
export const pushEnabled = Boolean(publicKey && privateKey);

const DAY_S = 24 * 60 * 60;
const TIMEOUT_MS = 10_000;

/**
 * Sends `payload` to every device the member turned notifications on for, except the `skip` endpoints (devices with
 * the app on screen, which show an in-app banner instead). Undelivered pushes for the same `tag` replace each other,
 * and a subscription the push service no longer knows is dropped.
 */
export async function pushTo(userId, payload, skip = []) {
  if (!pushEnabled) return;
  const devices = await PushSubscription.find({ user: userId, endpoint: { $nin: skip } }).lean();
  const options = { vapidDetails: { subject, publicKey, privateKey }, TTL: DAY_S, urgency: 'high', topic: payload.tag };
  await Promise.all(
    devices.map(async ({ _id, endpoint, keys }) => {
      try {
        const request = webpush.generateRequestDetails({ endpoint, keys }, JSON.stringify(payload), options);
        const res = await fetch(request.endpoint, { method: request.method, headers: request.headers, body: request.body, signal: AbortSignal.timeout(TIMEOUT_MS) });
        if (res.status === 404 || res.status === 410) await PushSubscription.deleteOne({ _id });
      } catch (error) {
        console.warn(`Push to a device failed: ${error.message}`);
      }
    }),
  );
}
