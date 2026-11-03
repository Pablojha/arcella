import { Router } from 'express';
import { USER_TYPES } from '../config/constants.js';
import * as ctrl from '../controllers/users.controller.js';
import { auth } from '../middleware/auth.js';
import { exportLimiter } from '../middleware/rateLimit.js';
import { images } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { link, list, listQuery, objectId, required, text, z } from '../utils/zod.js';

const experience = z.object({
  title: required(80),
  org: required(80),
  start: text(20).optional(),
  end: text(20).optional(),
  description: text(600).optional(),
});

const profileSchema = z.object({
  name: required(60, 2).optional(),
  headline: text(120).optional(),
  bio: text(1500).optional(),
  location: text(80).optional(),
  website: link,
  software: list(25),
  skills: list(30),
  experience: z.array(experience).max(20).optional(),
});

const searchSchema = listQuery({
  software: text(40).optional(),
  college: objectId.optional(),
  type: z.enum(USER_TYPES).optional(),
});

const router = Router();

router.use(auth);
router.get('/', validate(searchSchema, 'query'), ctrl.search);
router.get('/suggestions', ctrl.suggestions);
router.patch('/me', validate(profileSchema), ctrl.updateMe);
router.delete('/me', validate(z.object({ password: z.string().min(1).max(100) })), ctrl.deleteMe);
router.get('/me/blocked', ctrl.blockedList);
router.get('/me/export', exportLimiter, ctrl.exportMe);
router.post('/me/avatar', images.single('image'), ctrl.updateImage('avatar'));
router.post('/me/cover', images.single('image'), ctrl.updateImage('cover'));
router.get('/:id', ctrl.profile);
router.post('/:id/block', ctrl.toggleBlock);

export default router;
