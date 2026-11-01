import { Router } from 'express';
import * as ctrl from '../controllers/colleges.controller.js';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { required, text, z } from '../utils/zod.js';

const collegeSchema = z.object({ name: required(150, 3), city: required(60), state: required(60) });

const router = Router();

router.use(auth);
router.get('/', validate(z.object({ q: text(80).optional() }), 'query'), ctrl.list);
router.post('/', validate(collegeSchema), ctrl.create);
router.get('/:id', ctrl.get);
router.get('/:id/members', ctrl.members);

export default router;
