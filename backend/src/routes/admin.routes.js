import { Router } from 'express';
import { ROLES } from '../config/permissions.js';
import * as ctrl from '../controllers/admin.controller.js';
import { auth, can } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { membershipDetails, membershipRules } from '../utils/membership.schema.js';
import { bool, int, listQuery, objectId, required, text, z } from '../utils/zod.js';

const domains = z.preprocess(
  (value) =>
    value == null
      ? undefined
      : (Array.isArray(value) ? value : String(value).split(',')).map((d) => String(d).trim().toLowerCase().replace(/^@/, '')).filter(Boolean),
  z.array(z.string().regex(/^[a-z0-9-]+(\.[a-z0-9-]+)+$/, 'Enter domains like college.ac.in')).max(10).optional(),
);

const collegeSchema = z.object({
  name: required(150, 3).optional(),
  short: text(40).optional(),
  city: text(60).optional(),
  state: text(60).optional(),
  domains,
});

const verifySchema = membershipRules(z.object(membershipDetails));
const usersQuery = listQuery({ college: objectId.optional(), role: z.enum(ROLES).optional(), status: z.enum(['active', 'suspended', 'banned']).optional() });
const statusSchema = z.object({ status: z.enum(['active', 'suspended', 'banned']), days: int(1, 365), reason: text(300).optional() });
const reasonSchema = z.object({ reason: required(300) });
const auditQuery = listQuery({ action: text(40).optional(), actor: objectId.optional(), target: objectId.optional() });

const router = Router();

// Every route needs a staff role, then the permission for what it does.
router.use(auth, can('admin:access'));
router.get('/stats', can('stats:read'), ctrl.stats);
router.get('/users', can('users:read'), validate(usersQuery, 'query'), ctrl.users);
router.get('/users/:id', can('users:read'), ctrl.user);
router.patch('/users/:id/role', can('roles:manage'), validate(z.object({ role: z.enum(ROLES) })), ctrl.setRole);
router.post('/users/:id/status', can('users:suspend'), validate(statusSchema), ctrl.setStatus);
router.post('/users/:id/verify', can('users:verify'), validate(verifySchema), ctrl.verifyUser);
router.delete('/users/:id/verify', can('users:verify'), ctrl.revokeUser);
router.get('/colleges', can('colleges:manage'), validate(listQuery(), 'query'), ctrl.colleges);
router.patch('/colleges/:id', can('colleges:manage'), validate(collegeSchema), ctrl.updateCollege);
router.get('/reports', can('reports:read'), validate(listQuery(), 'query'), ctrl.reports);
router.post('/reports/:id/resolve', can('reports:resolve'), validate(z.object({ action: z.enum(['remove', 'dismiss']) })), ctrl.resolveReport);
router.get('/jobs', can('jobs:moderate'), validate(listQuery({ closed: bool }), 'query'), ctrl.jobs);
router.delete('/jobs/:id', can('jobs:moderate'), validate(reasonSchema), ctrl.removeJob);
router.get('/firms', can('firms:moderate'), validate(listQuery({ verified: bool }), 'query'), ctrl.firms);
router.patch('/firms/:id', can('firms:moderate'), validate(z.object({ verified: z.boolean() })), ctrl.verifyFirm);
router.delete('/firms/:id', can('firms:moderate'), validate(reasonSchema), ctrl.removeFirm);
router.get('/audit', can('audit:read'), validate(auditQuery, 'query'), ctrl.auditLog);

export default router;
