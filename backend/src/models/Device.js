import { Schema, model } from 'mongoose';
import { ref } from './types.js';

/**
 * A signed-in device. Its id is in the session token, so deleting it signs that device out at once. Devices unused
 * for 30 days (the token lifetime) are dropped.
 */
const deviceSchema = new Schema(
  {
    user: ref('User', { required: true, index: true }),
    agent: String,
    ip: String,
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

deviceSchema.index({ lastSeenAt: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export default model('Device', deviceSchema);
