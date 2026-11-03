import { Schema, model } from 'mongoose';
import { ref } from './types.js';

/** One staff action (role change, suspension, removal, verification…), kept for a year and never editable. */
const auditLogSchema = new Schema(
  {
    actor: ref('User', { required: true }),
    action: { type: String, required: true },
    targetType: String,
    target: Schema.Types.ObjectId,
    // What was changed and why, e.g. { role: 'moderator' } or { until, reason }.
    details: Schema.Types.Mixed,
    ip: String,
  },
  { timestamps: { createdAt: true, updatedAt: false } },
);

auditLogSchema.index({ actor: 1, _id: -1 });
auditLogSchema.index({ target: 1, _id: -1 });
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 365 * 24 * 60 * 60 });

export default model('AuditLog', auditLogSchema);
