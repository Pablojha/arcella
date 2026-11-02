import { Schema, model } from 'mongoose';
import { ref } from './types.js';

/** One person's settings for one chat: pinned (up to 3) or hidden. The other person never sees them. */
const chatStateSchema = new Schema({
  user: ref('User', { required: true }),
  other: ref('User', { required: true }),
  pinnedAt: Date,
  hidden: { type: Boolean, default: false },
});

chatStateSchema.index({ user: 1, other: 1 }, { unique: true });

export default model('ChatState', chatStateSchema);
