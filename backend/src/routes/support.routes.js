import { Router } from 'express';
import { SUPPORT_TOPICS } from '../config/constants.js';
import * as ctrl from '../controllers/support.controller.js';
import { auth, can } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { bool, listQuery, required, text, z } from '../utils/zod.js';

const ticketSchema = z.object({
  topic: z.enum(SUPPORT_TOPICS),
  subject: required(120, 3),
  message: required(4000, 10),
  page: text(300).optional(),
});

const router = Router();

router.use(auth);
router.post('/', writeLimiter, validate(ticketSchema), ctrl.create);
router.get('/mine', validate(listQuery(), 'query'), ctrl.mine);
router.post('/:id/replies', writeLimiter, validate(z.object({ text: required(4000) })), ctrl.followUp);
router.get('/queue', can('support:read'), validate(listQuery({ status: z.enum(['open', 'answered', 'closed']).optional() }), 'query'), ctrl.queue);
router.post('/:id/answer', can('support:answer'), validate(z.object({ text: text(4000).optional(), close: bool }).refine((body) => body.text || body.close, 'Write a reply or close the request')), ctrl.answer);

export default router;
