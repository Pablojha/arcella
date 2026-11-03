import { Schema, model } from 'mongoose';
import { gifSchema, mediaSchema, reactionSchema, voiceSchema } from './chatContent.js';
import { ref } from './types.js';

/** A message in a college's group chat: text, one photo or video, a GIF or a voice note, with one reaction per member. */
const groupMessageSchema = new Schema(
  {
    college: ref('College', { required: true }),
    author: ref('User', { required: true, index: true }),
    text: { type: String, trim: true },
    media: mediaSchema,
    gif: gifSchema,
    voice: voiceSchema,
    reactions: [reactionSchema],
  },
  { timestamps: true },
);

groupMessageSchema.index({ college: 1, _id: -1 });

export default model('GroupMessage', groupMessageSchema);
