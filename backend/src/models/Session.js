import { Schema, model } from 'mongoose';
import { SESSION_STATUSES } from '../config/constants.js';
import { ref } from './types.js';

const sessionSchema = new Schema(
  {
    mentor: ref('User', { required: true, index: true }),
    mentee: ref('User', { required: true, index: true }),
    topic: { type: String, required: true },
    slot: { type: String, required: true },
    note: String,
    status: { type: String, enum: SESSION_STATUSES, default: 'pending' },
  },
  { timestamps: true },
);

export default model('Session', sessionSchema);
