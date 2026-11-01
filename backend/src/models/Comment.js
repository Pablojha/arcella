import { Schema, model } from 'mongoose';
import { ref } from './types.js';

const commentSchema = new Schema(
  {
    post: ref('Post', { required: true, index: true }),
    author: ref('User', { required: true }),
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

export default model('Comment', commentSchema);
