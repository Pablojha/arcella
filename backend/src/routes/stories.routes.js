import { Router } from 'express';
import * as ctrl from '../controllers/stories.controller.js';
import { auth } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import { images } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { required, text, z } from '../utils/zod.js';

const router = Router();

router.use(auth);
router.get('/', ctrl.list);
router.post('/', writeLimiter, images.single('image'), validate(z.object({ caption: text(200).optional() })), ctrl.create);
router.post('/:id/view', ctrl.view);
router.post('/:id/reply', writeLimiter, validate(z.object({ text: required(1000) })), ctrl.reply);
router.delete('/:id', ctrl.remove);

export default router;
