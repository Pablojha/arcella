import { Router } from 'express';
import * as ctrl from '../controllers/ai.controller.js';
import { auth } from '../middleware/auth.js';
import { aiLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { objectId, text, z } from '../utils/zod.js';

const router = Router();

router.use(auth);
router.get('/status', ctrl.status);
router.post('/improve', aiLimiter, validate(z.object({ kind: z.enum(['post', 'headline', 'about']), draft: text(3000).optional() })), ctrl.improve);
router.post('/resume-feedback', aiLimiter, ctrl.resumeFeedback);
router.post('/job-match/:jobId', aiLimiter, validate(z.object({ jobId: objectId }), 'params'), ctrl.jobMatch);

export default router;
