import { Schema, model } from 'mongoose';
import { ref } from './types.js';

const commentSchema = new Schema(
  {
    post: ref('Post', { required: true, index: true }),
    author: ref('User', { required: true }),
    text: { type: String, required: true, trim: true },
    // Replies hang off the first comment of their thread (one level deep, like Instagram); `replyTo` is whom they answer.
    parent: ref('Comment', { default: null }),
    replyTo: ref('User'),
    likes: [ref('User')],
  },
  { timestamps: true },
);

export default model('Comment', commentSchema);
