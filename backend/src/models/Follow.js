import { Schema, model } from 'mongoose';
import { ref } from './types.js';

/** One member following another: their public posts join the follower's network feed. No approval needed. */
const followSchema = new Schema(
  {
    follower: ref('User', { required: true }),
    following: ref('User', { required: true, index: true }),
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

followSchema.index({ follower: 1, following: 1 }, { unique: true });

export default model('Follow', followSchema);
