import { Router } from 'express';
import * as ctrl from '../controllers/posts.controller.js';
import { auth } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import { postMedia } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { bool, decimal, listQuery, objectId, optionalId, required, text, z } from '../utils/zod.js';

const feedSchema = listQuery({
  scope: z.enum(['all', 'network']).optional(),
  author: objectId.optional(),
  college: objectId.optional(),
  saved: bool,
  video: bool,
  firm: objectId.optional(),
  tag: z.string().trim().regex(/^[\p{L}\p{N}_-]{2,40}$/u, 'Invalid hashtag').optional(),
});

const postSchema = z.object({ text: text(3000).optional(), college: optionalId, firm: optionalId, important: bool, aspect: decimal(0.05, 20) });
const repostSchema = z.object({ text: text(3000).optional() });
const commentSchema = z.object({ text: required(1000), parent: optionalId });

const router = Router();

router.use(auth);
router.get('/', validate(feedSchema, 'query'), ctrl.feed);
router.post('/', writeLimiter, postMedia, validate(postSchema), ctrl.create);
router.get('/:id', ctrl.get);
router.patch('/:id', writeLimiter, validate(z.object({ text: text(3000).optional() })), ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/like', ctrl.like);
router.post('/:id/save', ctrl.save);
router.post('/:id/repost', writeLimiter, validate(repostSchema), ctrl.repost);
router.delete('/:id/repost', ctrl.undoRepost);
router.get('/:id/comments', ctrl.comments);
router.post('/:id/comments', writeLimiter, validate(commentSchema), ctrl.addComment);
router.post('/:id/comments/:commentId/like', ctrl.likeComment);
router.delete('/:id/comments/:commentId', ctrl.removeComment);

export default router;
