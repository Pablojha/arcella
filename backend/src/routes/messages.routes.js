import { Router } from 'express';
import * as ctrl from '../controllers/messages.controller.js';
import { auth } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { objectId, required, z } from '../utils/zod.js';

const router = Router();

router.use(auth);
router.get('/', ctrl.conversations);
router.get('/:userId', validate(z.object({ after: objectId.optional() }), 'query'), ctrl.thread);
router.post('/:userId', writeLimiter, validate(z.object({ text: required(2000) })), ctrl.send);

export default router;
