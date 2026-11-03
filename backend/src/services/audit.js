import AuditLog from '../models/AuditLog.js';

/** Records a staff action. It is awaited, so an action that can't be logged fails rather than going unrecorded. */
export const audit = (req, action, target, details) =>
  AuditLog.create({ actor: req.user._id, action, targetType: target?.type, target: target?.id, details, ip: req.ip });
