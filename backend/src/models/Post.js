import { Schema, model } from 'mongoose';
import { ref } from './types.js';

const postSchema = new Schema(
  {
    author: ref('User', { required: true }),
    text: { type: String, trim: true },
    images: [String],
    // The first photo's width / height, kept between 4:5 and 1.91:1, so the feed sizes it before it loads.
    aspect: Number,
    video: String,
    important: { type: Boolean, default: false },
    likes: [ref('User')],
    saves: [ref('User')],
    commentsCount: { type: Number, default: 0 },
    // Set only on reposts: without text it is a plain repost, with text the reposter's words sit above the original.
    repostOf: ref('Post'),
    repostsCount: { type: Number, default: 0 },
    college: ref('College', { default: null }),
    // Read from the text: #hashtags (lowercase) and the members it @mentions.
    tags: [String],
    mentions: [ref('User')],
    editedAt: Date,
  },
  { timestamps: true },
);

postSchema.index({ college: 1, _id: -1 });
postSchema.index({ author: 1, _id: -1 });
postSchema.index({ saves: 1, _id: -1 });
postSchema.index({ repostOf: 1, author: 1 });
postSchema.index({ tags: 1, _id: -1 });

export default model('Post', postSchema);
