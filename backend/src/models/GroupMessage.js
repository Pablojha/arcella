import { Schema, model } from 'mongoose';
import { ref } from './types.js';

const groupMessageSchema = new Schema(
  {
    college: ref('College', { required: true }),
    author: ref('User', { required: true, index: true }),
    text: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

groupMessageSchema.index({ college: 1, _id: -1 });

export default model('GroupMessage', groupMessageSchema);
