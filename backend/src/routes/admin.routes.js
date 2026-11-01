import { Router } from 'express';
import { COLLEGE_ROLES } from '../config/constants.js';
import * as ctrl from '../controllers/admin.controller.js';
import { adminOnly, auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { int, listQuery, objectId, required, text, z } from '../utils/zod.js';

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

const verifySchema = z
  .object({ college: objectId, role: z.enum(COLLEGE_ROLES), batch: int(1950, new Date().getFullYear() + 6) })
  .refine((data) => data.role === 'faculty' || Boolean(data.batch), { message: 'Batch year is required', path: ['batch'] });

const router = Router();

router.use(auth, adminOnly);
router.get('/stats', ctrl.stats);
router.get('/users', validate(listQuery({ college: objectId.optional() }), 'query'), ctrl.users);
router.post('/users/:id/verify', validate(verifySchema), ctrl.verifyUser);
router.delete('/users/:id/verify', ctrl.revokeUser);
router.get('/colleges', validate(listQuery(), 'query'), ctrl.colleges);
router.patch('/colleges/:id', validate(collegeSchema), ctrl.updateCollege);
router.post('/colleges/:id/moderators/:userId', ctrl.toggleModerator);
router.get('/reports', validate(listQuery(), 'query'), ctrl.reports);
router.post('/reports/:id/resolve', validate(z.object({ action: z.enum(['remove', 'dismiss']) })), ctrl.resolveReport);

export default router;
