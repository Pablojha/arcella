import { Schema, model } from 'mongoose';
import { APPLICATION_STATUSES } from '../config/constants.js';
import { ref } from './types.js';

/**
 * One member's application to one job. The resume is kept in the database rather than at a public URL, and only the
 * applicant and the people hiring for the job can open it.
 */
const applicationSchema = new Schema(
  {
    job: ref('Job', { required: true }),
    applicant: ref('User', { required: true, index: true }),
    note: String,
    resume: {
      name: String,
      mime: String,
      size: Number,
      data: { type: Buffer, select: false },
    },
    status: { type: String, enum: APPLICATION_STATUSES, default: 'applied' },
    interview: { at: Date, note: String },
    history: [{ _id: false, status: String, at: { type: Date, default: Date.now } }],
  },
  { timestamps: true },
);

applicationSchema.index({ job: 1, applicant: 1 }, { unique: true });
applicationSchema.index({ job: 1, status: 1, _id: -1 });

export default model('Application', applicationSchema);
