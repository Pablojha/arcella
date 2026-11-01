import { Router } from 'express';
import * as chat from '../controllers/chat.controller.js';
import * as ctrl from '../controllers/colleges.controller.js';
import { auth } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { objectId, required, text, z } from '../utils/zod.js';

const collegeSchema = z.object({ name: required(150, 3), city: required(60), state: required(60) });
const roleSchema = z.object({ role: z.enum(['admin', 'coAdmin']), user: objectId.nullable() });
const chatQuery = z.object({ after: objectId.optional(), before: objectId.optional() });

const router = Router();

router.use(auth);
router.get('/', validate(z.object({ q: text(80).optional() }), 'query'), ctrl.list);
router.post('/', validate(collegeSchema), ctrl.create);
router.get('/:id', ctrl.get);
router.get('/:id/members', ctrl.members);
router.patch('/:id/roles', validate(roleSchema), ctrl.setRole);
router.get('/:id/chat', validate(chatQuery, 'query'), chat.list);
router.post('/:id/chat', writeLimiter, validate(z.object({ text: required(2000) })), chat.send);
router.delete('/:id/chat/:messageId', chat.remove);

export default router;
