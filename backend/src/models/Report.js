import { Schema, model } from 'mongoose';
import { REPORT_REASONS, REPORT_TYPES } from '../config/constants.js';
import { ref } from './types.js';

const reportSchema = new Schema(
  {
    reporter: ref('User', { required: true }),
    type: { type: String, enum: REPORT_TYPES, required: true },
    target: { type: Schema.Types.ObjectId, required: true },
    reason: { type: String, enum: REPORT_REASONS, required: true },
    note: String,
    status: { type: String, enum: ['open', 'removed', 'dismissed'], default: 'open' },
    resolvedBy: ref('User'),
  },
  { timestamps: true },
);

reportSchema.index({ status: 1, _id: -1 });
reportSchema.index({ type: 1, target: 1 });

export default model('Report', reportSchema);
