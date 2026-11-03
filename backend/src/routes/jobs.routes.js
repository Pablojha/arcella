import { Router } from 'express';
import { APPLICATION_STATUSES, EXPERIENCE, JOB_TYPES, WORKPLACES } from '../config/constants.js';
import * as ctrl from '../controllers/jobs.controller.js';
import { auth } from '../middleware/auth.js';
import { resumeFile } from '../middleware/upload.js';
import { validate } from '../middleware/validate.js';
import { bool, date, link, list, listQuery, objectId, optionalId, required, text, z } from '../utils/zod.js';

const fields = {
  title: required(100),
  type: z.enum(JOB_TYPES),
  firm: optionalId,
  company: text(100).optional(),
  location: text(80).optional(),
  workplace: z.enum(WORKPLACES).optional(),
  experience: z.preprocess((value) => (value === '' ? undefined : value), z.enum(EXPERIENCE).optional()),
  compensation: text(60).optional(),
  description: text(5000).optional(),
  skills: list(15),
  // Left empty, people apply in Arcella.
  applyLink: link,
  deadline: date,
};

const createSchema = z.object(fields);
const updateSchema = z.object({ ...fields, closed: bool }).partial();

const listSchema = listQuery({
  type: z.enum(JOB_TYPES).optional(),
  location: text(80).optional(),
  remote: bool,
  workplace: z.enum(WORKPLACES).optional(),
  experience: z.enum(EXPERIENCE).optional(),
  firm: objectId.optional(),
  saved: bool,
  hiring: bool,
});

const applySchema = z.object({ note: text(1500).optional(), savedResume: bool });
const statusQuery = listQuery({ status: z.enum(APPLICATION_STATUSES).optional() });
const statusSchema = z.object({
  status: z.enum(APPLICATION_STATUSES.filter((status) => status !== 'withdrawn')),
  interviewAt: date,
  interviewNote: text(300).optional(),
});

const router = Router();

router.use(auth);
router.get('/', validate(listSchema, 'query'), ctrl.list);
router.post('/', validate(createSchema), ctrl.create);
router.get('/applications', validate(statusQuery, 'query'), ctrl.mine);
router.post('/applications/:applicationId/withdraw', ctrl.withdraw);
router.patch('/applications/:applicationId', validate(statusSchema), ctrl.setStatus);
router.get('/applications/:applicationId/resume', ctrl.resume);
router.get('/:id', ctrl.get);
router.patch('/:id', validate(updateSchema), ctrl.update);
router.delete('/:id', ctrl.remove);
router.post('/:id/save', ctrl.save);
router.post('/:id/applications', resumeFile.single('resume'), validate(applySchema), ctrl.apply);
router.get('/:id/applications', validate(statusQuery, 'query'), ctrl.applicants);

export default router;
