import { Router } from 'express';
import { SUBJECTS } from '../config/constants.js';
import * as ctrl from '../controllers/questions.controller.js';
import { auth } from '../middleware/auth.js';
import { writeLimiter } from '../middleware/rateLimit.js';
import { validate } from '../middleware/validate.js';
import { listQuery, required, text, z } from '../utils/zod.js';

const questionSchema = z.object({ title: required(160, 10), body: text(5000).optional(), subject: z.enum(SUBJECTS) });
const answerSchema = z.object({ body: required(5000) });
const listSchema = listQuery({ subject: z.enum(SUBJECTS).optional(), sort: z.enum(['new', 'top', 'unanswered']).optional() });

const router = Router();

router.use(auth);
router.get('/', validate(listSchema, 'query'), ctrl.list);
router.post('/', writeLimiter, validate(questionSchema), ctrl.create);
router.get('/:id', ctrl.get);
router.delete('/:id', ctrl.remove);
router.post('/:id/upvote', ctrl.upvote);
router.post('/:id/answers', writeLimiter, validate(answerSchema), ctrl.answer);
router.post('/:id/answers/:answerId/upvote', ctrl.upvoteAnswer);
router.post('/:id/answers/:answerId/accept', ctrl.accept);
router.delete('/:id/answers/:answerId', ctrl.removeAnswer);

export default router;
