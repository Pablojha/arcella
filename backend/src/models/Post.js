import { Schema, model } from 'mongoose';
import { ref } from './types.js';

const postSchema = new Schema(
  {
    author: ref('User', { required: true }),
    text: { type: String, trim: true },
    images: [String],
    likes: [ref('User')],
    commentsCount: { type: Number, default: 0 },
    college: ref('College', { default: null }),
  },
  { timestamps: true },
);

postSchema.index({ college: 1, _id: -1 });
postSchema.index({ author: 1, _id: -1 });

export default model('Post', postSchema);
