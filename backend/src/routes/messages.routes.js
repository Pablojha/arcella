import { Router } from 'express';
import * as ctrl from '../controllers/messages.controller.js';
import { auth } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import { chatAttachment } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { decimal, int, objectId, text, z } from '../utils/zod.js';

const parseJson = (value) => {
  try {
    return typeof value === 'string' && value ? JSON.parse(value) : undefined;
  } catch {
    return value;
  }
};

const giphyUrl = z.string().url().refine((url) => /^https:\/\/(media\d?|i)\.giphy\.com\//.test(url), 'Pick a GIF from the GIF search');
const sendSchema = z
  .object({ text: text(2000).optional(), gif: z.object({ url: giphyUrl, width: int(1, 4000), height: int(1, 4000) }).optional() })
  .refine((body) => body.text || body.gif, { message: 'Write a message' });
const attachmentSchema = z.object({
  kind: z.enum(['image', 'video', 'voice']),
  width: int(1, 20000),
  height: int(1, 20000),
  duration: decimal(0, 3600),
  waveform: z.preprocess(parseJson, z.array(z.number().min(0).max(1)).max(64).optional()),
});

const router = Router();

router.use(auth);
router.get('/', ctrl.conversations);
router.get('/:userId', validate(z.object({ after: objectId.optional(), before: objectId.optional() }), 'query'), ctrl.thread);
router.post('/:userId', writeLimiter, validate(sendSchema), ctrl.send);
router.post('/:userId/attachments', writeLimiter, chatAttachment, validate(attachmentSchema), ctrl.sendAttachment);

export default router;
