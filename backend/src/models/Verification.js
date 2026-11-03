import { Schema, model } from 'mongoose';
import { COLLEGE_ROLES, DEGREE_LEVELS, DOC_TYPES } from '../config/constants.js';
import { ref } from './types.js';

const verificationSchema = new Schema(
  {
    user: ref('User', { required: true }),
    college: ref('College', { required: true }),
    role: { type: String, enum: COLLEGE_ROLES, required: true },
    level: { type: String, enum: DEGREE_LEVELS },
    degree: String,
    batch: Number,
    graduation: Number,
    method: { type: String, enum: ['email', 'document', 'manual'], required: true },
    status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    email: { type: String, lowercase: true },
    docType: { type: String, enum: DOC_TYPES },
    docData: { type: Buffer, select: false },
    docMime: String,
    reviewer: ref('User'),
    note: String,
    reviewedAt: Date,
  },
  { timestamps: true },
);

verificationSchema.index({ user: 1, status: 1 });
verificationSchema.index({ status: 1, method: 1, college: 1 });

export default model('Verification', verificationSchema);
