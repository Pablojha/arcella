import { Schema, model } from 'mongoose';
import { ref } from './types.js';

/** One sign-in attempt on an account, kept for 90 days: members see them in Settings, and failures drive the lockout. */
const loginEventSchema = new Schema(
  {
    user: ref('User', { required: true }),
    ok: { type: Boolean, required: true },
    // Why it failed: a wrong password or two-factor code, or the account being locked for a while.
    reason: { type: String, enum: ['password', 'two_factor', 'locked'] },
    agent: String,
    ip: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

loginEventSchema.index({ user: 1, _id: -1 });
loginEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export default model('LoginEvent', loginEventSchema);
