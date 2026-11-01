import { Router } from 'express';
import { JOB_TYPES } from '../config/constants.js';
import * as ctrl from '../controllers/jobs.controller.js';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { bool, date, list, listQuery, objectId, optionalId, required, requiredLink, text, z } from '../utils/zod.js';

const jobSchema = z.object({
  title: required(100),
  type: z.enum(JOB_TYPES),
  firm: optionalId,
  company: text(100).optional(),
  location: text(80).optional(),
  remote: bool,
  compensation: text(60).optional(),
  description: text(5000).optional(),
  skills: list(15),
  applyLink: requiredLink,
  deadline: date,
});

const listSchema = listQuery({
  type: z.enum(JOB_TYPES).optional(),
  location: text(80).optional(),
  remote: bool,
  firm: objectId.optional(),
});

const router = Router();

router.use(auth);
router.get('/', validate(listSchema, 'query'), ctrl.list);
router.post('/', validate(jobSchema), ctrl.create);
router.get('/:id', ctrl.get);
router.delete('/:id', ctrl.remove);

export default router;
