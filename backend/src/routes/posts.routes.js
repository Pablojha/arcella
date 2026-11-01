import { Router } from 'express';
import * as ctrl from '../controllers/posts.controller.js';
import { auth } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import { images } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { listQuery, objectId, optionalId, required, text, z } from '../utils/zod.js';

const feedSchema = listQuery({
  scope: z.enum(['all', 'network']).optional(),
  author: objectId.optional(),
  college: objectId.optional(),
});

const postSchema = z.object({ text: text(3000).optional(), college: optionalId });
const commentSchema = z.object({ text: required(1000) });

const router = Router();

router.use(auth);
router.get('/', validate(feedSchema, 'query'), ctrl.feed);
router.post('/', writeLimiter, images.array('images', 4), validate(postSchema), ctrl.create);
router.get('/:id', ctrl.get);
router.delete('/:id', ctrl.remove);
router.post('/:id/like', ctrl.like);
router.get('/:id/comments', ctrl.comments);
router.post('/:id/comments', writeLimiter, validate(commentSchema), ctrl.addComment);
router.delete('/:id/comments/:commentId', ctrl.removeComment);

export default router;
