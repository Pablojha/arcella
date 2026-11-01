import { Router } from 'express';
import { CRITERIA } from '../config/constants.js';
import * as ctrl from '../controllers/critiques.controller.js';
import { auth, optionalAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { text, z } from '../utils/zod.js';

const critiqueSchema = z.object({
  scores: z.object(Object.fromEntries(CRITERIA.map((criterion) => [criterion, z.coerce.number().int().min(1).max(5)]))),
  comment: text(1500).optional(),
});

const router = Router({ mergeParams: true });

router.get('/', optionalAuth, ctrl.list);
router.post('/', auth, validate(critiqueSchema), ctrl.save);

export default router;
