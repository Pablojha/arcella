import { Schema, model } from 'mongoose';
import { ref } from './types.js';

/** One browser or phone that gets push notifications for a member. Gone on sign-out, or once the push service drops it. */
const pushSubscriptionSchema = new Schema(
  {
    user: ref('User', { required: true, index: true }),
    endpoint: { type: String, required: true, unique: true },
    keys: { p256dh: { type: String, required: true }, auth: { type: String, required: true } },
  },
  { timestamps: true },
);

export default model('PushSubscription', pushSubscriptionSchema);
