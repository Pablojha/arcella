import { Schema, model } from 'mongoose';
import { ref } from './types.js';

export const STORY_TTL_SECONDS = 24 * 60 * 60;

const storySchema = new Schema({
  author: ref('User', { required: true }),
  // The author's verified colleges when posted: their members see the story too.
  colleges: [ref('College')],
  image: { type: String, required: true },
  caption: String,
  viewers: [ref('User')],
  createdAt: { type: Date, default: Date.now, expires: STORY_TTL_SECONDS },
});

storySchema.index({ author: 1, createdAt: 1 });
storySchema.index({ colleges: 1, createdAt: 1 });

export default model('Story', storySchema);
