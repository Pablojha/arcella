import { Router } from 'express';
import * as ctrl from '../controllers/search.controller.js';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { required, z } from '../utils/zod.js';

const router = Router();

router.get('/', auth, validate(z.object({ q: required(80) }), 'query'), ctrl.search);

export default router;
