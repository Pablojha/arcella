import { Router } from 'express';
import * as ctrl from '../controllers/messages.controller.js';
import { auth } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import { chatAttachment } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { bool, objectId, z } from '../utils/zod.js';
import { attachmentSchema, reactionSchema, sendSchema } from './chat.schemas.js';

const stateSchema = z
  .object({ pinned: z.boolean().optional(), hidden: z.boolean().optional() })
  .refine((body) => body.pinned !== undefined || body.hidden !== undefined, { message: 'Choose pin or hide' });

const router = Router();

router.use(auth);
router.get('/', validate(z.object({ hidden: bool }), 'query'), ctrl.conversations);
router.put('/reactions/:messageId', writeLimiter, validate(reactionSchema), ctrl.react);
router.patch('/:userId/state', validate(stateSchema), ctrl.setState);
router.get('/:userId', validate(z.object({ after: objectId.optional(), before: objectId.optional() }), 'query'), ctrl.thread);
router.post('/:userId', writeLimiter, validate(sendSchema), ctrl.send);
router.post('/:userId/attachments', writeLimiter, chatAttachment, validate(attachmentSchema), ctrl.sendAttachment);

export default router;
