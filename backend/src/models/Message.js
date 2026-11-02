import { Schema, model } from 'mongoose';
import { ref } from './types.js';

const mediaSchema = new Schema(
  { url: { type: String, required: true }, kind: { type: String, enum: ['image', 'video'], required: true }, width: Number, height: Number, duration: Number },
  { _id: false },
);
const gifSchema = new Schema({ url: { type: String, required: true }, width: Number, height: Number }, { _id: false });
const voiceSchema = new Schema({ url: { type: String, required: true }, duration: Number, waveform: [Number] }, { _id: false });

/** A direct message: text, one photo or video, a GIF, or a voice note (older messages are text only). */
const messageSchema = new Schema(
  {
    from: ref('User', { required: true }),
    to: ref('User', { required: true }),
    text: { type: String, trim: true },
    media: mediaSchema,
    gif: gifSchema,
    voice: voiceSchema,
    storyImage: String,
    read: { type: Boolean, default: false },
  },
  { timestamps: true },
);

messageSchema.index({ from: 1, to: 1, _id: -1 });
messageSchema.index({ to: 1, read: 1 });

export default model('Message', messageSchema);
