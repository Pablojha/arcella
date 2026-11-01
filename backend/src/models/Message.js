import { Schema, model } from 'mongoose';
import { ref } from './types.js';

const messageSchema = new Schema(
  {
    from: ref('User', { required: true }),
    to: ref('User', { required: true }),
    text: { type: String, required: true, trim: true },
    storyImage: String,
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

messageSchema.index({ from: 1, to: 1, _id: -1 });
messageSchema.index({ to: 1, read: 1 });

export default model('Message', messageSchema);
