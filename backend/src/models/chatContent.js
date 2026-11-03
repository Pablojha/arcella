import { Schema } from 'mongoose';
import { ref } from './types.js';

/** What a chat message (direct or in a college group) can hold besides text. */
export const mediaSchema = new Schema(
  { url: { type: String, required: true }, kind: { type: String, enum: ['image', 'video'], required: true }, width: Number, height: Number, duration: Number },
  { _id: false },
);
export const gifSchema = new Schema({ url: { type: String, required: true }, width: Number, height: Number }, { _id: false });
export const voiceSchema = new Schema({ url: { type: String, required: true }, duration: Number, waveform: [Number] }, { _id: false });
export const reactionSchema = new Schema({ user: ref('User', { required: true }), emoji: { type: String, required: true }, at: Date }, { _id: false });
