import { Router } from 'express';
import { REPORT_REASONS, REPORT_TYPES } from '../config/constants.js';
import * as ctrl from '../controllers/reports.controller.js';
import { auth } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { objectId, text, z } from '../utils/zod.js';

const reportSchema = z.object({
  type: z.enum(REPORT_TYPES),
  target: objectId,
  reason: z.enum(REPORT_REASONS),
  note: text(500).optional(),
});

const router = Router();

router.post('/', auth, writeLimiter, validate(reportSchema), ctrl.create);

export default router;
