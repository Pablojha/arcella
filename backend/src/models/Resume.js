import { Schema, model } from 'mongoose';
import { ref } from './types.js';

/** A member's saved resume, private to them, which they can attach to job applications in one tap. */
const resumeSchema = new Schema(
  {
    user: ref('User', { required: true, unique: true }),
    name: String,
    mime: String,
    size: Number,
    data: { type: Buffer, select: false },
  },
  { timestamps: true },
);

export default model('Resume', resumeSchema);
