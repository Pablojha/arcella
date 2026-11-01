import { Schema, model } from 'mongoose';
import { JOB_TYPES } from '../config/constants.js';
import { ref } from './types.js';

const jobSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: JOB_TYPES, required: true },
    firm: ref('Firm', { index: true }),
    company: { type: String, required: true },
    location: String,
    remote: { type: Boolean, default: false },
    compensation: String,
    description: String,
    skills: [String],
    applyLink: { type: String, required: true },
    deadline: Date,
    postedBy: ref('User', { required: true }),
  },
  { timestamps: true },
);

jobSchema.index({ type: 1, _id: -1 });

/** Filter for roles that are still open: no deadline, or a deadline today or later. */
export function openRoles() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return { deadline: { $not: { $lt: today } } };
}

export default model('Job', jobSchema);
