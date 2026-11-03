import { Router } from 'express';
import { EVENT_TYPES } from '../config/constants.js';
import * as ctrl from '../controllers/events.controller.js';
import { auth } from '../middleware/auth.js';
import { images } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { bool, date, link, listQuery, objectId, optionalId, required, text, z } from '../utils/zod.js';

const eventSchema = z.object({
  title: required(120),
  type: z.enum(EVENT_TYPES),
  description: text(3000).optional(),
  start: z.coerce.date(),
  end: date,
  venue: text(150).optional(),
  online: bool,
  link,
  collegeOnly: bool,
  college: optionalId,
});

const listSchema = listQuery({
  type: z.enum(EVENT_TYPES).optional(),
  when: z.enum(['upcoming', 'past']).optional(),
  college: objectId.optional(),
});

const router = Router();

router.use(auth);
router.get('/', validate(listSchema, 'query'), ctrl.list);
router.post('/', images.single('cover'), validate(eventSchema), ctrl.create);
router.get('/:id', ctrl.get);
router.post('/:id/rsvp', ctrl.rsvp);
router.delete('/:id', ctrl.remove);

export default router;
