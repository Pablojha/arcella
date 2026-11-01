import { Router } from 'express';
import * as ctrl from '../controllers/mentorship.controller.js';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { bool, list, listQuery, objectId, required, text, z } from '../utils/zod.js';

const settingsSchema = z.object({
  enabled: bool,
  topics: list(10, 60),
  slots: list(10, 60),
  about: text(500).optional(),
});

const requestSchema = z.object({
  mentor: objectId,
  topic: required(60),
  slot: required(60),
  note: text(600).optional(),
});

const updateSchema = z.object({ status: z.enum(['accepted', 'declined', 'done', 'cancelled']) });

const router = Router();

router.use(auth);
router.get('/mentors', validate(listQuery(), 'query'), ctrl.mentors);
router.put('/settings', validate(settingsSchema), ctrl.settings);
router.get('/sessions', ctrl.sessions);
router.post('/sessions', validate(requestSchema), ctrl.request);
router.patch('/sessions/:id', validate(updateSchema), ctrl.update);

export default router;
