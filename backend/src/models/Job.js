import { Schema, model } from 'mongoose';
import { EXPERIENCE, JOB_TYPES, WORKPLACES } from '../config/constants.js';
import { ref } from './types.js';

const jobSchema = new Schema(
  {
    title: { type: String, required: true, trim: true },
    type: { type: String, enum: JOB_TYPES, required: true },
    firm: ref('Firm', { index: true }),
    company: { type: String, required: true },
    location: String,
    workplace: { type: String, enum: WORKPLACES, default: 'onsite' },
    // Kept in step with `workplace` for jobs and clients from before it existed.
    remote: { type: Boolean, default: false },
    experience: { type: String, enum: EXPERIENCE },
    compensation: String,
    description: String,
    skills: [String],
    // Without a link, people apply in Arcella with their resume.
    applyLink: String,
    deadline: Date,
    closed: { type: Boolean, default: false },
    savedBy: { type: [ref('User')], select: false },
    applicationsCount: { type: Number, default: 0 },
    postedBy: ref('User', { required: true, index: true }),
  },
  { timestamps: true },
);

jobSchema.index({ type: 1, _id: -1 });
jobSchema.index({ savedBy: 1 });

jobSchema.pre('validate', function syncRemote() {
  if (this.isNew || this.isModified('workplace')) this.remote = this.workplace === 'remote';
});

/** Filter for roles that are still open: not closed, and no deadline or a deadline today or later. */
export function openRoles() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return { closed: { $ne: true }, deadline: { $not: { $lt: today } } };
}

/** Jobs saved before `workplace` existed get it from their remote flag; returns how many changed. */
export async function migrateWorkplace() {
  const { modifiedCount } = await model('Job').updateMany({ workplace: { $exists: false } }, [{ $set: { workplace: { $cond: ['$remote', 'remote', 'onsite'] } } }]);
  return modifiedCount;
}

export default model('Job', jobSchema);
