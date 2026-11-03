import { Schema, model } from 'mongoose';
import { gifSchema, mediaSchema, reactionSchema, voiceSchema } from './chatContent.js';
import { ref } from './types.js';

const lastReactionSchema = new Schema({ user: ref('User'), emoji: String, at: Date }, { _id: false });

/**
 * A direct message: text, one photo or video, a GIF, or a voice note (older messages are text only). Each person may
 * leave one reaction; `lastReaction` remembers the newest for the chat-list preview.
 */
const messageSchema = new Schema(
  {
    from: ref('User', { required: true }),
    to: ref('User', { required: true }),
    text: { type: String, trim: true },
    media: mediaSchema,
    gif: gifSchema,
    voice: voiceSchema,
    storyImage: String,
    reactions: [reactionSchema],
    lastReaction: lastReactionSchema,
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

messageSchema.index({ from: 1, to: 1, _id: -1 });
messageSchema.index({ to: 1, read: 1 });

export default model('Message', messageSchema);
